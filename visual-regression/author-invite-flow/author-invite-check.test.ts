import * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { authorInviteCheck } from '../../src/author-invite-flow'
import { html, plainText } from '../../src/html'
import { page as templatePage } from '../../src/page'
import type { Pseudonym } from '../../src/types/pseudonym'
import { expect, test } from '../base'

test('content looks right', async ({ page }) => {
  const response = await authorInviteCheck({
    id: 'ee9dd955-7b3b-4ad2-8a61-25dd42cb70f0' as Uuid,
    method: 'GET',
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })({
    getAuthorInvite: () => TE.right({ review: 1234 }),
    getPrereview: () =>
      TE.right({
        preprint: {
          title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
          language: 'en',
        },
      }),
  })()

  if (response._tag !== 'StreamlinePageResponse') {
    throw new Error('incorrect page response')
  }

  const content = html`<main id="${response.skipToLabel}">${response.main}</main>`

  const pageHtml = templatePage({
    content,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})
