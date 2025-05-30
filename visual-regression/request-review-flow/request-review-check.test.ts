import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { DefaultLocale } from '../../src/locales/index.js'
import { checkPage } from '../../src/request-review-flow/check-page/check-page.js'
import { failureMessage } from '../../src/request-review-flow/check-page/failure-message.js'
import type { ReviewRequestPreprintId } from '../../src/review-request.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import { expect, test } from '../base.js'

const preprint = {
  _tag: 'biorxiv',
  value: Doi('10.1101/2022.01.13.476201'),
} satisfies ReviewRequestPreprintId

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = checkPage({
    preprint,
    reviewRequest: {
      status: 'incomplete',
      persona: 'public',
    },
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a pseudonym', async ({ showPage }) => {
  const response = checkPage({
    preprint,
    reviewRequest: {
      status: 'incomplete',
      persona: 'pseudonym',
    },
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid('0000-0002-1825-0097'),
      pseudonym: 'Orange Panda' as Pseudonym,
    },
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when the change can't be made", async ({ showPage }) => {
  const content = await showPage(failureMessage(locale))

  await expect(content).toHaveScreenshot()
})
