import { Effect } from 'effect'
import * as _ from '../../src/ExternalInteractions/Email/AcknowledgeReviewRequest/CreateEmail.ts'
import { html } from '../../src/html.ts'
import { BiorxivPreprintId, type PreprintTitle } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { Name } from '../../src/types/Name.ts'
import { expect, test } from '../base.ts'

test('HTML looks right', async ({ page }) => {
  const email = await Effect.runPromise(
    _.CreateEmail({
      requester: {
        name: Name('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
      },
      preprint,
    }),
  )

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('text looks right', { tag: '@text' }, async () => {
  const email = await Effect.runPromise(
    _.CreateEmail({
      requester: {
        name: Name('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
      },
      preprint,
    }),
  )

  expect(`${email.text}\n`).toMatchSnapshot()
})

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
