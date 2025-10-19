#!/bin/bash

# deploy.sh: AI Event Sentinel 一键部署脚本
#
# 该脚本将自动完成以下任务:
# 1.  安装 cron-worker 的依赖
# 2.  创建 Cloudflare KV 命名空间
# 3.  从用户输入获取密钥 (Gemini, Resend)
# 4.  创建 .dev.vars 文件用于本地开发
# 5.  部署 settings-worker 和 cron-worker
# 6.  将密钥上传到 Cloudflare Secrets
# 7.  部署前端到 Cloudflare Pages
# 8.  自动更新 settings-worker 的 CORS 配置
# 9.  为 debug 环境部署并上传密钥

# --- 配置 ---
# 颜色定义
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# --- 函数定义 ---

# 打印信息
info() {
    echo -e "${BLUE}INFO: $1${NC}"
}

# 打印成功信息
success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# 打印警告信息
warn() {
    echo -e "${YELLOW}WARN: $1${NC}"
}

# 打印错误信息并退出
error() {
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查依赖
check_deps() {
    info "正在检查依赖 (wrangler, npm)..."
    if ! command_exists wrangler; then
        error "Wrangler 未安装。请先运行 'npm install -g wrangler'。"
    fi
    if ! command_exists npm; then
        error "npm 未安装。请先安装 Node.js 和 npm。"
    fi
    success "依赖检查通过。"
}

# --- 业务逻辑函数 ---

# 首次设置
setup() {
    info "--- 步骤 1: 首次设置 ---"
    
    info "正在为 cron-worker 安装 npm 依赖..."
    (cd packages/backend/cron-worker && npm install) || error "npm install 失败。"
    success "依赖安装完成。"

    info "正在创建 Cloudflare KV 命名空间 'SENTINEL_KV'..."
    KV_OUTPUT=$(wrangler kv:namespace create SENTINEL_KV)
    KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d '"' -f 2)

    if [ -z "$KV_ID" ]; then
        error "创建 KV 命名空间失败。请检查您的 Wrangler 登录状态。"
    fi
    success "KV 命名空间创建成功 (ID: $KV_ID)。"

    info "正在更新 wrangler.toml 文件..."
    sed -i.bak "s/id = \".*\"/id = \"$KV_ID\"/g" packages/backend/cron-worker/wrangler.toml packages/backend/cron-worker/wrangler.debug.toml packages/backend/settings-worker/wrangler.toml
    rm -f packages/backend/cron-worker/*.bak packages/backend/settings-worker/*.bak
    success "所有 wrangler.toml 文件已更新。"

    info "请输入您的 API 密钥 (仅在首次设置时需要):"
    read -p "Gemini API Key: " GEMINI_API_KEY
    read -p "Resend API Key: " RESEND_API_KEY
    read -p "Resend 发件邮箱 (e.g., sender@yourdomain.com): " RESEND_FROM_EMAIL

    if [ -z "$GEMINI_API_KEY" ] || [ -z "$RESEND_API_KEY" ] || [ -z "$RESEND_FROM_EMAIL" ]; then
        error "所有密钥和邮箱都不能为空。"
    fi

    info "正在创建 'packages/backend/cron-worker/.dev.vars' 用于本地开发..."
    cat > packages/backend/cron-worker/.dev.vars << EOL
GEMINI_API_KEY="$GEMINI_API_KEY"
RESEND_API_KEY="$RESEND_API_KEY"
RESEND_FROM_EMAIL="$RESEND_FROM_EMAIL"
EOL
    success ".dev.vars 文件创建成功。"
}

# 部署生产环境
deploy_prod() {
    info "--- 步骤 2: 部署生产环境 ---"

    if [ ! -f "packages/backend/cron-worker/.dev.vars" ]; then
        error ".dev.vars 文件不存在。请先运行 'scripts/deploy.sh' 进行首次设置。"
    fi
    source packages/backend/cron-worker/.dev.vars

    info "正在部署 settings-worker..."
    (cd packages/backend/settings-worker && wrangler deploy) || error "settings-worker 部署失败。"
    SETTINGS_WORKER_URL=$(cd packages/backend/settings-worker && wrangler deployments list | grep -o 'https://[^ ]*' | head -n 1)
    success "settings-worker 部署成功。"

    info "正在部署 cron-worker (生产环境)..."
    (cd packages/backend/cron-worker && wrangler deploy) || error "cron-worker 部署失败。"
    success "cron-worker 部署成功。"

    info "正在上传生产环境密钥..."
    echo "$GEMINI_API_KEY" | wrangler secret put GEMINI_API_KEY --name event-tracker-cron-worker
    echo "$RESEND_API_KEY" | wrangler secret put RESEND_API_KEY --name event-tracker-cron-worker
    echo "$RESEND_FROM_EMAIL" | wrangler secret put RESEND_FROM_EMAIL --name event-tracker-cron-worker
    success "生产环境密钥上传成功。"

    info "正在部署前端页面..."
    (cd packages/frontend && wrangler pages deploy . --project-name event-tracker-page) || error "前端部署失败。"
    FRONTEND_URL=$(wrangler pages deployment list --project-name event-tracker-page | grep -o 'https://[^ ]*' | head -n 1)
    success "前端部署成功，URL: $FRONTEND_URL"

    info "正在更新 frontend/config.js..."
    sed -i.bak "s|const workerUrl = '.*';|const workerUrl = '$SETTINGS_WORKER_URL';|g" packages/frontend/config.js
    rm -f packages/frontend/config.js.bak
    success "前端配置更新成功。"

    info "正在更新 settings-worker 的 CORS 策略..."
    sed -i.bak "s|ALLOWED_ORIGINS = \".*\"|ALLOWED_ORIGINS = \"$FRONTEND_URL\"|g" packages/backend/settings-worker/wrangler.toml
    rm -f packages/backend/settings-worker/wrangler.toml.bak
    
    info "正在重新部署 settings-worker 以应用新的 CORS 策略..."
    (cd packages/backend/settings-worker && wrangler deploy) || error "settings-worker 重新部署失败。"
    success "CORS 策略更新并部署成功。"
}

# 部署调试环境
deploy_debug() {
    info "--- 步骤 3: 部署调试环境 ---"

    if [ ! -f "packages/backend/cron-worker/.dev.vars" ]; then
        error ".dev.vars 文件不存在。请先运行 'scripts/deploy.sh' 进行首次设置。"
    fi
    source packages/backend/cron-worker/.dev.vars

    info "正在部署 cron-worker (Debug 环境)..."
    (cd packages/backend/cron-worker && wrangler deploy -c wrangler.debug.toml) || error "Debug Worker 部署失败。"
    success "Debug Worker 部署成功。"

    info "正在为 Debug 环境上传密钥..."
    echo "$GEMINI_API_KEY" | wrangler secret put GEMINI_API_KEY --name event-tracker-cron-worker-debug
    echo "$RESEND_API_KEY" | wrangler secret put RESEND_API_KEY --name event-tracker-cron-worker-debug
    echo "$RESEND_FROM_EMAIL" | wrangler secret put RESEND_FROM_EMAIL --name event-tracker-cron-worker-debug
    success "Debug 环境密钥上传成功。"
}

# 打印最终信息
print_summary() {
    FRONTEND_URL=$(wrangler pages deployment list --project-name event-tracker-page | grep -o 'https://[^ ]*' | head -n 1)
    SETTINGS_WORKER_URL=$(cd packages/backend/settings-worker && wrangler deployments list | grep -o 'https://[^ ]*' | head -n 1)
    DEBUG_WORKER_URL=$(cd packages/backend/cron-worker && wrangler deployments list -n event-tracker-cron-worker-debug | grep -o 'https://[^ ]*' | head -n 1)

    echo -e "\n\n🎉 ${GREEN}操作完成！${NC}\n"
    echo "--------------------------------------------------"
    echo -e "${YELLOW}重要信息:${NC}"
    echo "  - 前端页面 URL: $FRONTEND_URL"
    echo "  - 后端设置 API URL: $SETTINGS_WORKER_URL"
    echo "  - 手动触发 Debug Worker:"
    echo "    $DEBUG_WORKER_URL/__run_schedule"
    echo "--------------------------------------------------"
    echo "请访问您的前端页面 URL 以完成最后的配置。"
}

# 主函数
main() {
    check_deps

    case "$1" in
        prod)
            deploy_prod
            print_summary
            ;;
        debug)
            deploy_debug
            print_summary
            ;;
        "")
            setup
            deploy_prod
            deploy_debug
            print_summary
            ;;
        *)
            echo "用法: $0 [prod|debug]"
            echo "  (无参数)  : 首次完整安装和部署。"
            echo "  prod      : 仅部署或更新生产环境。"
            echo "  debug     : 仅部署或更新调试环境。"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
