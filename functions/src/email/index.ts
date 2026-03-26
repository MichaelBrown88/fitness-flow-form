export { EMAIL_TOKENS } from './tokens';
export { escapeHtml } from './escapeHtml';
export {
  renderEducationEmail,
  renderActivationEmail,
  renderNotificationEmail,
  type EducationEmailContent,
  type ActivationEmailContent,
  type NotificationEmailContent,
  type RenderedEmail,
  type EmailFooterVariant,
  type EmailCta,
} from './layouts';
export { sendResendHtmlText, type ResendHtmlTextPayload } from './sendResendHtmlText';
