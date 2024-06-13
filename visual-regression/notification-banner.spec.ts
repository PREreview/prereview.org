import { html, plainText } from '../src/html.js'
import { showNotificationBanner } from '../src/notification-banner.js'
import { PageResponse } from '../src/response.js'
import { expect, test } from './base.js'

test('notification-banner looks right with a success', async ({ showPage }) => {
  const content = await showPage(
    PageResponse({
      title: plainText`Notification Banner`,
      main: showNotificationBanner({
        type: 'success',
        title: html`Success`,
        content: html`<p>You have been logged out.</p>`,
      }),
      js: ['notification-banner.js'],
    }),
  )

  await expect(content).toHaveScreenshot()
})

test('notification-banner looks right with a failure', async ({ showPage }) => {
  const content = await showPage(
    PageResponse({
      title: plainText`Notification Banner`,
      main: showNotificationBanner({
        type: 'failure',
        title: html`Access denied`,
        content: html` <p>You are not allowed to log in.</p>`,
      }),
      js: ['notification-banner.js'],
    }),
  )

  await expect(content).toHaveScreenshot()
})

test('notification-banner looks right with a notice', async ({ showPage }) => {
  const content = await showPage(
    PageResponse({
      title: plainText`Notification Banner`,
      main: showNotificationBanner({
        type: 'notice',
        title: html`Important`,
        content: html`<p>We’re sending you an email. Please open it and follow the link to verify your address.</p>`,
      }),
      js: ['notification-banner.js'],
    }),
  )

  await expect(content).toHaveScreenshot()
})
