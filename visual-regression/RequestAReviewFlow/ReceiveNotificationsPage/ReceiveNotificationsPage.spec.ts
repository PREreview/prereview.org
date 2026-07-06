import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import * as ReceiveNotificationsForm from '../../../src/WebApp/RequestAReviewFlow/ReceiveNotificationsPage/ReceiveNotificationsForm.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/ReceiveNotificationsPage/ReceiveNotificationsPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderReceiveNotificationsPage({
    form: new ReceiveNotificationsForm.EmptyForm(),
    locale,
    preprintId,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = _.renderReceiveNotificationsPage({
    form: new ReceiveNotificationsForm.InvalidForm({
      receiveNotifications: Either.left(new ReceiveNotificationsForm.Missing()),
    }),
    locale,
    preprintId,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprintId = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

const locale = DefaultLocale
