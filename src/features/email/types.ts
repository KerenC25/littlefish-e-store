export type EmailKind = 'order-confirmation' | 'newsletter-welcome';

/** What a template produces. Plain text only: no HTML means no injection surface in the inbox. */
export interface EmailDraft {
  kind: EmailKind;
  to: string;
  subject: string;
  /** Short line shown in the inbox list. */
  preview: string;
  body: string;
  /** Optional in-app link (path relative to the app root), e.g. to track an order. */
  action?: { label: string; path: string };
}

export interface EmailMessage extends EmailDraft {
  id: string;
  sentAt: string;
  read: boolean;
}

/**
 * Port for outbound email (dependency inversion, like PaymentGateway).
 *
 * The app ships with a demo transport that delivers to an in-app inbox. A production
 * adapter would POST to our own backend, which calls a provider (Resend, SendGrid, SES)
 * with a secret API key that must never be shipped to the browser.
 */
export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}
