// 1. Build-time descriptor factory
export function customBrevoPlugin() {
	return {
		id: "custom-brevo-email",
		name: "Custom Brevo Email",
		version: "1.0.0",
		// Bypasses Node path utilities by leveraging Vite's built-in web-safe URL converter
		entrypoint: new URL('./brevo-plugin.js', import.meta.url).pathname, 
	};
}

// 2. Runtime execution block
export function createPlugin() {
	return {
		id: "custom-brevo-email",
		version: "1.0.0",
		register(ctx) {
			ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
				try {
					// Secure runtime extraction from Cloudflare's dashboard environment variables
					const runtimeEnv = ctx?.env || process?.env || globalThis || {};
					
					const BREVO_API_KEY = runtimeEnv.BREVO_API_KEY; 
					const SENDER_EMAIL = "sorin@sorinv.com";
					const SENDER_NAME = "Porchi's Website";

					if (!BREVO_API_KEY || !SENDER_EMAIL) {
						console.error("Brevo Plugin Error: Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in Cloudflare settings.");
						return;
					}

					const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
					console.error("Critical error in Brevo execution block:", err);
				}
			});
		}
	};
}

