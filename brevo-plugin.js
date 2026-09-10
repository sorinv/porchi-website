import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

export function customBrevoPlugin() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);

	return {
		id: "custom-brevo-email",
		name: "Custom Brevo Email",
		version: "1.0.0",
		entrypoint: resolve(__dirname, './brevo-plugin.js'), 
	};
}

export function createPlugin() {
	return {
		id: "custom-brevo-email",
		version: "1.0.0",
		register(ctx) {
			// Wrap the entire assignment safely inside the execution hook, 
			// ensuring it only runs when an actual email is being triggered.
			ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
				try {
					// Fallbacks to safely fetch Cloudflare's runtime variables
					const runtimeEnv = ctx?.env || process?.env || globalThis || {};
					
					const BREVO_API_KEY = runtimeEnv.BREVO_API_KEY; 
					const SENDER_EMAIL = "sorin@sorinv.com";
					const SENDER_NAME = "Porchi's Website";

					if (!BREVO_API_KEY || !SENDER_EMAIL) {
						console.error("Brevo Plugin Error: Missing BREVO_API_KEY or BREVO_SENDER_EMAIL environment variable.");
						return;
					}

					const response = await fetch("https://brevo.com", {
						method: "POST",
						headers: {
							"accept": "application/json",
							"api-key": BREVO_API_KEY,
							"content-type": "application/json"
						},
						body: JSON.stringify({
							sender: { name: SENDER_NAME, email: SENDER_EMAIL },
							to: [{ email: to }],
							subject: subject,
							htmlContent: html || text
						})
					});

					if (!response.ok) {
						const errorText = await response.text();
						console.error("Brevo delivery failed:", errorText);
					}
				} catch (err) {
					console.error("Critical error in Brevo Plugin execution pipeline:", err);
				}
			});
		}
	};
}

