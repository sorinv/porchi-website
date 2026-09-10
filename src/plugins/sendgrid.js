// SendGrid email transport plugin for EmDash
//
// Shape verified against the EmDash bundle:
//   - plugin.hooks is a plain object keyed by hook name (HookPipeline.registerPluginHook)
//   - plugin.capabilities is a plain array (checked with .includes)
//   - handler is called as handler(event, ctx) by invokeExclusiveHook
//   - event is { message, source }; message is { to, subject, text, html? }
//   - failure MUST throw -- the return value is not inspected for errors

const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
const SENDER_EMAIL = "sorin@pagepeeker.com";
const SENDER_NAME = "Porchi Website";

// Build-time factory descriptor (used in astro.config.mjs)
export function customSendgridPlugin() {
	return {
		id: "custom-sendgrid-email",
		name: "SendGrid Email Provider",
		version: "1.0.0",
		entrypoint: new URL("./sendgrid.js", import.meta.url).pathname,
	};
}

export function createPlugin() {
	return {
		id: "custom-sendgrid-email",
		version: "1.0.0",
		storage: {},
		// Plain array. Required for the email:deliver hook to be registered at all --
		// HOOK_REQUIRED_CAPABILITY maps email:deliver -> this capability, and a
		// mismatch is a silent console.warn + skip, not an error.
		capabilities: ["hooks.email-transport:register"],

		hooks: {
			"email:deliver": {
				exclusive: true,
				timeout: 10000, // read by executeWithTimeout
				pluginId: "custom-sendgrid-email",
				priority: 100,
        		dependencies: [],
				handler: async (event, ctx) => {
				    const { env } = await import("cloudflare:workers");
				    const apiKey = env.SENDGRID_API_KEY;
					
					const { message } = event;
					const { to, subject, text, html } = message;

					if (!apiKey) {
						// Throwing is the contract: invokeExclusiveHook catches it and
						// sendInner rethrows, so the caller sees a real failure.
						throw new Error("[sendgrid] SENDGRID_API_KEY missing from ctx.env");
					}

					const content = [];
					if (text) content.push({ type: "text/plain", value: text });
					if (html) content.push({ type: "text/html", value: html });

					const res = await fetch("https://api.brevo.com/v3/smtp/email", {
					    method: "POST",
					    headers: {
					        "api-key": apiKey,
					        "Content-Type": "application/json",
					        "accept": "application/json",
					    },
					    body: JSON.stringify({
					        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
					        to: [{ email: to }],
					        subject,
					        htmlContent: html,
					        textContent: text,
					    }),
					});
					
					// SendGrid returns 202 Accepted with an empty body on success.
					if (!res.ok) {
						const detail = await res.text().catch(() => "<unreadable>");
						console.log(`[sendgrid] send failed ${res.status}: ${detail}`);
						throw new Error(`[sendgrid] send failed ${res.status}: ${detail}`);
					}

					return { ok: true, status: res.status };
				},
			},
		},
	};
}
