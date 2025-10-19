# AI 事件哨兵 (AI Event Sentinel)

这是一个自动化信息监控和分析工具，旨在通过 AI 技术帮助用户追踪特定事件的最新进展。

当您关心某个持续发展的事件时，可以设置相关的 Google Alerts，本项目将自动获取、分析并仅在发现“实质性新进展”时向您发送邮件通知，从而过滤掉大量重复和无关的信息噪音。

## 主要特性

-   **自动化监控**：设置一次后，系统将 7x24 小时自动为您监控信息。
-   **AI 智能过滤**：利用 Google Gemini AI 的分析能力，只推送包含关键进展的新闻，有效减少信息干扰。
-   **一键部署**：提供自动化脚本，五分钟内即可完成所有服务的部署和配置。
-   **完全无服务器**：基于 Cloudflare 构建，无需管理自己的服务器，成本极低。
-   **配置简单**：通过网页界面随时更新您要追踪的 RSS 链接和接收邮箱。

## 技术栈

-   **后端**: Cloudflare Workers
-   **存储**: Cloudflare KV
-   **AI 模型**: Google Gemini
-   **邮件服务**: Resend
-   **前端**: Cloudflare Pages (HTML, Tailwind CSS, Vanilla JavaScript)
-   **部署/CLI**: Wrangler, Bash Script

## 部署与配置

### 前提条件

1.  拥有一个 [Cloudflare](https://www.cloudflare.com/) 账户。
2.  安装 [Node.js](https://nodejs.org/) (v18 或更高版本)。
3.  一个类 Unix 终端 (如 Linux, macOS, or Windows Subsystem for Linux)。
4.  获取以下 API 密钥:
    -   **Gemini API Key**: 前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 创建。
    -   **Resend API Key & 发件邮箱**: 前往 [Resend](https://resend.com/) 注册，创建一个 API 密钥并配置一个已验证的域名和发件邮箱。

### 环境变量配置

在首次运行部署脚本时，系统会提示您输入以下密钥，这些密钥将作为 [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) 安全地存储：

| 变量名              | 描述                                     | 获取方式                                     |
| ------------------- | ---------------------------------------- | -------------------------------------------- |
| `GEMINI_API_KEY`    | 用于调用 Google Gemini AI 进行内容分析的密钥。 | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `RESEND_API_KEY`    | 用于发送邮件通知的 Resend 服务密钥。       | [Resend Dashboard](https://resend.com/api-keys)      |
| `RESEND_FROM_EMAIL` | 您在 Resend 上验证过的发件邮箱地址。       | [Resend Dashboard](https://resend.com/domains)       |

### 部署流程

部署分为两种情况：首次安装和后续更新。

#### 1. 首次安装

如果您是第一次部署，可以直接运行脚本，它会自动完成所有设置和部署。

```bash
# 克隆项目
git clone [您的仓库地址]
cd event-tracker

# 赋予脚本执行权限
chmod +x scripts/deploy.sh

# 运行完整安装流程
./scripts/deploy.sh
```

脚本会引导您完成以下步骤：
-   **首次设置**: 安装依赖、创建 KV 命名空间并提示您输入 API 密钥。
-   **部署生产环境**: 部署 `settings-worker`、生产版的 `cron-worker` 和前端页面。
-   **部署调试环境**: 部署 `debug` 版的 `cron-worker` 并为其配置密钥。

#### 2. 更新特定环境

在首次部署之后，您可以根据需要独立更新生产或调试环境。

-   **仅更新生产环境**:
    如果您修改了前端代码或生产环境的 Worker 代码，运行：
    ```bash
    ./scripts/deploy.sh prod
    ```

-   **仅更新调试环境**:
    如果您只修改了 `cron-worker` 并希望在调试环境中测试，运行：
    ```bash
    ./scripts/deploy.sh debug
    ```

部署成功后，脚本会输出您的前端页面 URL。访问该 URL，输入您想要监控的 Google Alerts RSS 链接和接收通知的邮箱，即可开始使用。

## 手动触发调试

如果您需要手动触发 `cron-worker` 进行测试，部署脚本的输出中包含了 Debug Worker 的 URL。访问该 URL 并添加 `/__run_schedule` 路径即可手动触发一次任务。

例如: `https://event-tracker-cron-worker-debug.your-username.workers.dev/__run_schedule`

您可以在 Cloudflare 仪表盘中查看 `event-tracker-cron-worker-debug` 的实时日志。

## 工作原理

项目由一个前端页面和两个后端 Worker 组成，它们协同工作以实现自动化监控和智能过滤。

```mermaid
graph TD
    A[用户] -->|1. 打开配置页面| B(Frontend on Cloudflare Pages);
    B -->|2. 提交RSS链接和邮箱| C[settings-worker];
    C -->|3. 保存配置到| D[Cloudflare KV];
    
    subgraph 定时任务 (Cron Trigger)
        E[Cloudflare Cron] -->|4. 定时触发| F[cron-worker];
        F -->|5. 从KV读取配置| D;
        F -->|6. 获取RSS文章| G[Google Alerts RSS];
        F -->|7. 过滤已读文章| D;
        F -->|8. 调用AI分析新文章| H[Google Gemini AI];
        H -->|9. 判断是否有新进展| F;
        F -->|10. 发送邮件通知| I[Resend API];
        I -->|11. 发送到用户邮箱| A;
        F -->|12. 更新已读文章列表| D;
    end
```

### 组件职责

-   **Frontend (Cloudflare Pages)**
    -   一个纯静态的 HTML 页面，提供用户界面，让用户可以输入或更新他们想要追踪的 Google Alerts RSS 链接和接收通知的邮箱地址。

-   **`settings-worker`**
    -   一个 API 服务，负责接收来自前端的请求。
    -   它会将用户提交的配置（RSS 链接和邮箱）安全地存储在 Cloudflare KV 中。

-   **`cron-worker`**
    -   项目的核心，由 Cloudflare Cron 定时触发（例如每 5 分钟一次）。
    -   **读取配置**: 从 Cloudflare KV 中获取用户保存的 RSS 链接和邮箱。
    -   **拉取与去重**: 访问 RSS 链接，获取最新的文章列表，并与 KV 中存储的已处理文章 ID 进行比对，确保每篇文章只处理一次。
    -   **AI 分析**: 将新文章的内容发送给 Google Gemini AI，并根据预设的指令（Prompt）判断文章是否包含“实质性的新进展”。
    -   **发送通知**: 如果 AI 判断为有新进展，则通过 Resend 服务向用户的邮箱发送邮件通知。
    -   **更新状态**: 将已处理的新文章 ID 保存回 KV，用于下次去重。

-   **Cloudflare KV**
    -   一个键值存储服务，用于持久化存储两类数据：
        1.  用户的配置信息（RSS 链接和邮箱）。
        2.  已处理过的文章 ID 列表，用于避免重复分析和发送通知。

## 贡献

欢迎对本项目做出贡献！如果您有任何改进建议或发现了 Bug，请随时提出 Issue 或提交 Pull Request。

## 许可证

本项目采用 [MIT License](LICENSE) 开源。
