/**
 * 这个 Worker 是一个简单的 API 端点。
 * 它接收来自前端 index.html 的 POST 请求，
 * 并将 RSS 链接、邮箱地址和邮件主题等设置安全地存储在 KV 中。
 */
export default {
    async fetch(request, env) {
        // --- 安全地处理 CORS ---
        // 从环境变量中读取允许的来源域名，环境变量是一个用逗号分隔的字符串
        const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(item => item.trim()) : [];
        const origin = request.headers.get('Origin');
        
        let corsHeaders = {
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        // 如果请求来源在白名单中，则动态设置 CORS 头
        if (origin && allowedOrigins.includes(origin)) {
            corsHeaders['Access-Control-Allow-Origin'] = origin;
        }

        // 如果是 OPTIONS 预检请求，直接返回带有动态 CORS 头的成功响应。
        if (request.method === "OPTIONS") {
            // Handle CORS preflight requests.
            if (origin && allowedOrigins.includes(origin)) {
                 return new Response(null, {
                    status: 204,
                    headers: corsHeaders,
                });
            } else {
                // Block requests from non-whitelisted origins
                return new Response('CORS policy does not allow this origin.', { status: 403 });
            }
        }

        // --- 只接受 POST 请求 ---
        if (request.method !== "POST") {
            return new Response("请求方法必须是 POST", { status: 405, headers: corsHeaders });
        }

        try {
            // --- 解析前端发来的 JSON 数据 ---
            const settings = await request.json();

            // --- 数据校验 ---
            if (!settings.rssUrls || !Array.isArray(settings.rssUrls) || settings.rssUrls.length === 0) {
                return new Response("rssUrls 必须是一个非空数组", { status: 400, headers: corsHeaders });
            }
            if (!settings.email) {
                return new Response("缺少 email 字段", { status: 400, headers: corsHeaders });
            }
             if (!settings.emailSubject) {
                return new Response("缺少 emailSubject 字段", { status: 400, headers: corsHeaders });
            }

            // --- 将设置存入 KV ---
            // "SETTINGS" 是存储在 KV 中的键名 (Key)。
            await env.SENTINEL_KV.put("SETTINGS", JSON.stringify(settings));

            return new Response("设置已成功保存！", { status: 200, headers: corsHeaders });

        } catch (err) {
            console.error(err);
            return new Response(`处理请求时发生错误: ${err.message}`, { status: 500, headers: corsHeaders });
        }
    },
};
