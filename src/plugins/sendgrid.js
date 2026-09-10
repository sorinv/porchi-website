// SendGrid email provider plugin for EmDash
//
// NOTE ON `entrypoint` BELOW: this is copied from the Brevo version and is the
// line most likely responsible for the broken D1/R2 bindings. It is NOT fixed
// here, because the correct value depends on how EmDash resolves plugin
// entrypoints at build time -- check the docs or an official plugin before
// trusting it. See the comment at the bottom of this file.

const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
const SENDER_EMAIL = "sorin@sorinv.com";
const SENDER_NAME = "Porchi Website";
const TIMEOUT_MS = 8000;

// 1. Build-time factory descriptor (used in astro.config.mjs)
export function customSendgridPlugin() {
	return {
		id: "custom-sendgrid-email",
		name: "SendGrid Email Provider",
		version: "1.0.0",
		entrypoint: new URL("./sendgrid.js", import.meta.url).pathname, // <-- suspect, see note above
	};
}

// 2. The explicit named export required by EmDash's bundling module
export function createPlugin() {
	return {
		id: "custom-sendgrid-email",
		version: "1.0.0",
		register(ctx) {
			ctx.capabilities.add("hooks.email-transport:register");
			
			ctx.hooks.register("email:deliver", async ({ to, subject, html, text }) => {
				// Env comes from ctx only. `process` is not defined on Workers, and
				// `process?.env` still throws ReferenceError on an undeclared
				// identifier -- optional chaining does not protect against that.
				const apiKey = ctx?.env?.SENDGRID_API_KEY;

				if (!apiKey) {
					console.error("[sendgrid] SENDGRID_API_KEY missing from ctx.env");
					return { ok: false, error: "missing_api_key" };
				}

				if (!to || !subject || (!html && !text)) {
					console.error("[sendgrid] refusing to send: incomplete message", { to, subject });
					return { ok: false, error: "incomplete_message" };
				}

				const content = [];
				if (text) content.push({ type: "text/plain", value: text });
				if (html) content.push({ type: "text/html", value: html });

				try {
					const res = await fetch(SENDGRID_ENDPOINT, {
						method: "POST",
						headers: {
							"Authorization": `Bearer ${apiKey}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							personalizations: [{ to: [{ email: to }] }],
							from: { email: SENDER_EMAIL, name: SENDER_NAME },
							subject,
							content,
						}),
						signal: AbortSignal.timeout(TIMEOUT_MS),
					});

					// SendGrid returns 202 Accepted on success, with an empty body.
					if (!res.ok) {
						const detail = await res.text().catch(() => "<unreadable>");
						console.error(`[sendgrid] send failed: ${res.status}`, detail);
						return { ok: false, error: `http_${res.status}`, detail };
					}

					return { ok: true };
				} catch (err) {
					// Timeouts land here as an AbortError.
					console.error("[sendgrid] request threw:", err?.name, err?.message);
					return { ok: false, error: err?.name ?? "unknown" };
				}
			});
		},
	};
}
