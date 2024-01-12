import * as TE from 'fp-ts/TaskEither'
import type { Uuid } from 'uuid-ts'
import { authorInvite } from '../../src/author-invite-flow'
import { html, plainText } from '../../src/html'
import { page as templatePage } from '../../src/page'
import { expect, test } from '../base'

test('content looks right', async ({ page }) => {
  const response = await authorInvite('ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid)({
    getAuthorInvite: () => TE.right({ review: 1234 }),
    getPrereview: () =>
      TE.right({
        preprint: {
          title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
          language: 'en',
        },
      }),
  })()

  const content = html` <main id="${response.skipToLabel}">${response.main}</main> `

  const pageHtml = templatePage({
    content,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})
