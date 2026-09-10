// A simple, pure-javascript function that hooks directly into the running instance
export function injectBrevoEmail(config) {
	// If the plugins array doesn't exist yet, initialize it
	if (!config.plugins) {
		config.plugins = [];
	}

	// Push a naked plugin definition directly into EmDash's live execution cycle
	config.plugins.push({
		id: "custom-brevo-email",
		version: "1.0.0",
		register(ctx) {
			ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
				try {
					// Safely pull from Cloudflare Environment Variables at runtime
					const runtimeEnv = ctx?.env || process?.env || globalThis || {};
					
					const BREVO_API_KEY = runtimeEnv.BREVO_API_KEY; 
					const SENDER_EMAIL = "sorin@sorinv.com";
					const SENDER_NAME = "Porchi's Website";

					if (!BREVO_API_KEY || !SENDER_EMAIL) {
						console.error("Brevo Plugin Error: Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in Cloudflare settings.");
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
					console.error("Critical error in Brevo execution block:", err);
				}
			});
		}
	});

	return config;
}

