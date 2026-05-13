import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import * as RequestedReviewNotificationsForm from '../../../src/WebApp/MyDetails/RequestedReviewNotificationsPage/RequestedReviewNotificationsForm.ts'
import * as _ from '../../../src/WebApp/MyDetails/RequestedReviewNotificationsPage/RequestedReviewNotificationsPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.RequestedReviewNotificationsPage({
    form: new RequestedReviewNotificationsForm.EmptyForm(),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = _.RequestedReviewNotificationsPage({
    form: new RequestedReviewNotificationsForm.InvalidForm({
      requestedReviewNotifications: Either.left(new RequestedReviewNotificationsForm.Missing()),
    }),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale
