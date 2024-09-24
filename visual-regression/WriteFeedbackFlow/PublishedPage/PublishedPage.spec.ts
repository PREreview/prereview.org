import * as Doi from 'doi-ts'
import type { Uuid } from '../../../src/types/index.js'
import * as _ from '../../../src/WriteFeedbackFlow/PublishedPage/PublishedPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.PublishedPage({
    doi: Doi.Doi('10.5072/zenodo.107286'),
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    prereviewId: 10779310,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
