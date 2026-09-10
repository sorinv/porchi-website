import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

export function customBrevoPlugin() {
	// Find the exact absolute system path to this file during build time
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);

	return {
		id: "custom-brevo-email",
		name: "Custom Brevo Email",
		// This tells EmDash where to read the registration logic from
		entrypoint: resolve(__dirname, './brevo-plugin.js'), 
	};
}

// This is the actual execution function that EmDash calls via the entrypoint
export default function registerPlugin(ctx) {
	ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
		// Paste your actual credentials here
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
