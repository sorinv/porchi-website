import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import webhookNotifier from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";
import { customBrevoPlugin } from "./brevo-plugin.js"

const BREVO_API_KEY = import.meta.env.BREVO_API_KEY || process.env.BREVO_API_KEY;
const SENDER_EMAIL = "sorin@sorinv.com";
const SENDER_NAME = "Porchi Website";

const emdashConfig = {
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
//			plugins: [formsPlugin()],
//			sandboxed: [webhookNotifier],
			plugins: [
				formsPlugin(), 
				webhookNotifier,
				{
					id: "custom-brevo-email",
					version: "1.0.0",
					register(ctx) {
						ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
							try {
								if (!BREVO_API_KEY || !SENDER_EMAIL) {
									console.error("Brevo Plugin Error: Missing Compiled API Key or Sender Email.");
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
				}				
			],
			sandboxed: [],
			sandboxRunner: sandbox(),
			marketplace: "https://marketplace.emdashcms.com",
		};

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash(emdashConfig),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-body",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
