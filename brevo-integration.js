export function brevoEmailIntegration() {
	return {
		name: "brevo-email-injector",
		hooks: {
			"astro:config:done": ({ config }) => {
				// Locate EmDash inside Astro's live active integrations array
				const emdashIntegration = config.integrations.find(i => i.name === "emdash");
				
				if (emdashIntegration && emdashIntegration.options) {
					// Safely initialize the array if it is missing
					if (!emdashIntegration.options.plugins) {
						emdashIntegration.options.plugins = [];
					}

					// Inject the naked object right into the runtime pipeline 
					// after EmDash's compile-time validation has finished.
					emdashIntegration.options.plugins.push({
						id: "custom-brevo-email",
						version: "1.0.0",
						register(ctx) {
							ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
								try {
									const runtimeEnv = ctx?.env || process?.env || globalThis || {};
									const BREVO_API_KEY = runtimeEnv.BREVO_API_KEY; 
									const SENDER_EMAIL = "sorin@sorinv.com";
									const SENDER_NAME = "Porchi Website";

									if (!BREVO_API_KEY || !SENDER_EMAIL) {
										console.error("Brevo Error: Missing Cloudflare environment variables.");
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
									console.error("Critical error in Brevo hook:", err);
								}
							});
						}
					});
				}
			}
		}
	};
}
