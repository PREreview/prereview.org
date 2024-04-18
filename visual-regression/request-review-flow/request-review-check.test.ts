import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import { checkPage } from '../../src/request-review-flow/check-page/check-page'
import { failureMessage } from '../../src/request-review-flow/check-page/failure-message'
import type { ReviewRequestPreprintId } from '../../src/review-request'
import type { Pseudonym } from '../../src/types/pseudonym'
import { expect, test } from '../base'

const preprint = {
  type: 'biorxiv',
  value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
} satisfies ReviewRequestPreprintId

test('content looks right', async ({ showPage }) => {
  const response = checkPage({
    preprint,
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when the change can't be made", async ({ showPage }) => {
  const content = await showPage(failureMessage)

  await expect(content).toHaveScreenshot()
})
