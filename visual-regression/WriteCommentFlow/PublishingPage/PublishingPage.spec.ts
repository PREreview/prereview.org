import { DefaultLocale } from '../../../src/locales/index.js'
import { Uuid } from '../../../src/types/index.js'
import * as _ from '../../../src/WriteCommentFlow/PublishingPage/PublishingPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.PublishingPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
