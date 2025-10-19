import Parser from 'rss-parser';

/**
 * 这是核心的哨兵 Worker。
 * 它由 Cron 触发器定时激活，执行以下任务：
 * 1. 从 KV 读取用户设置。
 * 2. 遍历所有 RSS 链接并获取内容。
 * 3. 过滤掉已经处理过的新闻。
 * 4. 将新发现的新闻交给 Gemini AI 进行分析。
 * 5. 如果 AI 判断有新进展，则通过 Resend 发送邮件通知。
 * 6. 更新已处理的新闻 ID 列表到 KV。
 */
export default {
	/**
	 * fetch handler 是 C@W 处理 HTTP 请求的入口。
	 * 它也用作手动触发定时任务以进行调试的入口。
	 * @param {Request} request
	 * @param {object} env
	 * @param {ExecutionContext} ctx
	 * @returns {Response}
	 */
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// 检查是否是来自网页调试器的预览请求，或者是手动触发路径
		if (request.headers.get("host") === "cf-workers-preview.internal" || url.pathname === '/__run_schedule') {
			console.log("正在通过 fetch 手动触发定时任务...");
			try {
				ctx.waitUntil(this.scheduled(null, env, ctx));
				return new Response("手动触发成功！日志正在生成...", {
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			} catch (e) {
				console.error("手动触发时出错:", e);
				return new Response("手动触发失败。", { status: 500 });
			}
		}

		return new Response(
			`您好！这是 AI 哨兵的后台定时任务程序 (cron-worker)。\n它会根据设定的时间自动运行，无需手动访问。\n\n要手动触发一次以进行测试，请访问 /__run_schedule 路径。`,
			{
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			}
		);
	},

	/**
	 * scheduled handler 是 C@W 处理定时事件的入口。
	 * @param {ScheduledController | null} controller
	 * @param {object} env
	 * @param {ExecutionContext} ctx
	 */
	async scheduled(controller, env, ctx) {
		const isDebugMode = env.DEBUG === 'true';
		console.log(`Cron Worker 开始运行... (Debug Mode: ${isDebugMode})`);

		// 1. 从 KV 读取设置
		const settings = await env.SENTINEL_KV.get("SETTINGS", "json");
		if (!settings || !settings.rssUrls || settings.rssUrls.length === 0) {
			console.log("未找到有效的 RSS 设置。跳过本次运行。");
			return;
		}
		console.log("读取到设置:", JSON.stringify(settings, null, 2));

		// 2. 从 KV 读取已处理过的文章ID
		const processedIds = (await env.SENTINEL_KV.get("PROCESSED_IDS", "json")) || {};
		if (!isDebugMode) {
			console.log("当前已处理的ID列表:", JSON.stringify(processedIds, null, 2));
		}

		// 3. 遍历所有 RSS 源
		const parser = new Parser();
		let newItemsFound = 0;

		for (const rssUrl of settings.rssUrls) {
			try {
				console.log(`正在获取 RSS 源: ${rssUrl}`);
				const response = await fetch(rssUrl, { headers: { 'User-Agent': 'Cloudflare-Worker-RSS-Fetcher/1.0' }});
                if (!response.ok) {
                    throw new Error(`获取 RSS 源失败: ${response.status} ${response.statusText}`);
                }
				const rssText = await response.text();

				console.log(`正在解析 RSS 内容...`);
				const feed = await parser.parseString(rssText);
				const items = feed.items;
				console.log(`从源 ${rssUrl} 解析到 ${items.length} 篇文章。`);

				for (const item of items) {
					const guid = item.guid || item.link || item.id;
					
					// 在 DEBUG 模式下，无视是否已处理，强制处理所有文章
					if (guid && (isDebugMode || !processedIds[guid])) {
						newItemsFound++;
						console.log(`发现新文章 (或Debug模式): ${item.title}`);
						const description = item.contentSnippet || item.content || '';
						
						// 5. 调用 AI 分析
						const aiResponse = await callGeminiAI(item.title, description, env);
						console.log("AI 分析结果:", aiResponse);

						// 6. 判断并发送邮件
						if (aiResponse.startsWith("Update:")) {
							console.log("AI 判断有新进展，准备发送邮件...");
							await sendEmail(settings.email, settings.emailSubject, aiResponse, item.link, env);
						} else {
							console.log("AI 判断无新进展。");
						}
						
						// 只有在非 DEBUG 模式下，才将文章标记为已处理
						if (!isDebugMode) {
							processedIds[guid] = true;
						}
					}
				}
			} catch (err) {
				console.error(`处理 RSS 源 ${rssUrl} 时出错:`, err.message);
			}
		}
		
		console.log(`处理完成，共发现并处理了 ${newItemsFound} 篇新文章。`);

		// 7. 只有在非 DEBUG 模式下，才更新 KV 中的已处理列表
		if (!isDebugMode) {
			console.log("准备将更新后的ID列表写回KV:", JSON.stringify(processedIds, null, 2));
			ctx.waitUntil(env.SENTINEL_KV.put("PROCESSED_IDS", JSON.stringify(processedIds)));
		}
		
		console.log("Cron Worker 运行结束。");
	},
};

/**
 * 调用 Gemini AI 进行分析
 * @param {string} title - 文章标题
 * @param {string} description - 文章摘要
 * @param {object} env - Worker 环境变量
 * @returns {Promise<string>} - AI 的回复
 */
async function callGeminiAI(title, description, env) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const prompt = `
        你是一个专门跟踪特定事件的新闻分析助手。
        你的任务是判断以下这篇新文章是否包含关于该事件原因或责任方的【实质性新进展】。

        【文章标题】: ${title}
        【文章摘要】: ${description}

        请分析以上内容：
        1.  如果这篇文章只是重复报道已知事实，或者与主题无关，请严格地、且【只】回答：NoUpdate
        2.  如果这篇文章明确提到了【官方调查结果】、【具体的品牌/型号】或【责任方】等任何新的、关键的进展，请用中文总结这个新进展，并以Update:开头。

        你的回答非NoUpdate即Update:。
    `;
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0, // 确定性输出
                }
            }),
        });
        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.status} ${await response.text()}`);
        }
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    } catch (err) {
        console.error("调用 Gemini AI 时出错:", err);
        return "NoUpdate"; // 出错时默认为无更新
    }
}

/**
 * 通过 Resend 发送邮件
 * @param {string} to - 收件人邮箱
 * @param {string} subject - 邮件主题
 * @param {string} aiContent - AI 生成的内容
 * @param {string} link - 原文链接
 * @param {object} env - Worker 环境变量
 */
async function sendEmail(to, subject, aiContent, link, env) {
    const url = "https://api.resend.com/emails";
    
    const body = {
        from: env.RESEND_FROM_EMAIL,
        to: to,
        subject: subject,
        text: `${aiContent}\n\n原文链接: ${link}`,
    };

	console.log("准备发送邮件对象:", JSON.stringify(body, null, 2));

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`Resend API Error: ${response.status} ${await response.text()}`);
        }
        console.log("邮件发送成功!");
    } catch(err) {
        console.error("发送邮件时出错:", err);
    }
}
