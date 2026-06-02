import * as _ from '../../../src/WebApp/AuthorInviteFlow/PublishedPage/PublishedPage.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderPublishedPage({
    reviewId,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const reviewId = Uuid('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0')
