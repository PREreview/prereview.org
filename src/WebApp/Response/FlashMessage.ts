import { Schema } from 'effect'

export const FlashMessageSchema = Schema.Literal(
  'logged-out',
  'logged-in',
  'logged-in-demo',
  'blocked',
  'verify-contact-email',
  'verify-contact-email-resend',
  'contact-email-verified',
  'orcid-connected',
  'orcid-disconnected',
  'slack-connected',
  'slack-disconnected',
  'avatar-changed',
  'avatar-removed',
)
