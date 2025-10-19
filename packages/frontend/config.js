// 这个文件用来配置应用的环境变量
// 在本地调试和生产部署之间切换时，您只需要修改这里。

const APP_CONFIG = {
  // 本地调试时使用的 settings-worker URL
  // 请确保端口号与您 wrangler dev 运行时显示的端口一致
  development: "http://localhost:8789",

  // 部署到 Cloudflare 后，settings-worker 的生产环境 URL
  // 请将其替换为您自己的实际 Worker URL
  production: "https://event-tracker-settings-worker.testofdrive.workers.dev",
};

// --- 无需修改下面的代码 ---

// 通过判断当前页面的 URL 来自动选择环境
// 如果页面是通过 file:/// 或 localhost 打开的，就认为是开发环境
const isDevelopment = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 导出最终的 workerUrl
const workerUrl = isDevelopment ? APP_CONFIG.development : APP_CONFIG.production;
