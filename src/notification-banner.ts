import { type Html, html, rawHtml } from './html'

interface NotificationBanner {
  readonly type: 'success' | 'failure' | 'notice'
  readonly title: Html
  readonly content: Html
}

export const showNotificationBanner = ({ title, type, content }: NotificationBanner) => html`
  <notification-banner
    aria-labelledby="notification-banner-title"
    ${type !== 'success' ? rawHtml(`type="${type}"`) : ''}
    role="alert"
  >
    <h2 id="notification-banner-title">${title}</h2>

    ${content}
  </notification-banner>
`
