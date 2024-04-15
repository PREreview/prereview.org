import type { Orcid } from 'orcid-id-ts'
import { checkPage } from '../../src/request-review-flow/check-page/check-page'
import type { Pseudonym } from '../../src/types/pseudonym'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = checkPage({
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
