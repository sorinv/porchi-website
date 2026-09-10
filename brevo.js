// 1. Build-time factory descriptor (used in astro.config.mjs)
export function customBrevoPlugin() {
	return {
		id: "custom-brevo-email",
		name: "Brevo Email Provider",
		version: "1.0.0",
		// Passes compile validation by referencing this file itself
		entrypoint: new URL('./brevo.js', import.meta.url).pathname,
	};
}

// 2. The explicit named export required by EmDash's bundling module
export function createPlugin() {
	return {
		id: "custom-brevo-email",
		version: "1.0.0",
		register(ctx) {
			// This tells EmDash a valid provider exists so magic links don't block
			ctx.capabilities.add("email:deliver");

			ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
				try {
					const runtimeEnv = ctx?.env || process?.env || globalThis || {};
					const BREVO_API_KEY = runtimeEnv.BREVO_API_KEY;
					const SENDER_EMAIL = "sorin@sorinv.com";
					const SENDER_NAME = "Porchi Website";

					if (!BREVO_API_KEY || !SENDER_EMAIL) {
						console.error("Brevo Error: Missing environment credentials.");
						return;
					}

					await fetch("https://brevo.com", {
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
				} catch (err) {
					console.error("Brevo pipeline exception:", err);
				}
			});
		}
	};
}
