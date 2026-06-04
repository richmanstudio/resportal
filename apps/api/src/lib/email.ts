import { config } from "./config";
import { logger } from "./logger";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(message: EmailMessage) {
  if (config.emailMode === "webhook") {
    if (!config.emailWebhookUrl) {
      throw new Error("EMAIL_WEBHOOK_URL is required when EMAIL_MODE=webhook");
    }

    const response = await fetch(config.emailWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.emailFrom, ...message })
    });

    if (!response.ok) {
      throw new Error(`Email webhook failed with ${response.status}`);
    }
    return;
  }

  logger.info("email.console", {
    from: config.emailFrom,
    to: message.to,
    subject: message.subject,
    text: message.text
  });
}
