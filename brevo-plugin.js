export function customBrevoPlugin() {
	return {
		id: "custom-brevo-email",
		version: "1.0.0",
		register(ctx) {
			// Hook into EmDash's email delivery pipeline
			ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
				// Paste your credentials directly here
				const BREVO_API_KEY = "xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; 
				const SENDER_EMAIL = "your-verified-brevo@email.com";
				const SENDER_NAME = "Your App Name";

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
			});
		}
	};
}
