import { Effect, Layer } from 'effect'
import * as _ from '../../src/ExternalInteractions/Email/NotifyRequesterOfReview/CreateEmail.ts'
import { html } from '../../src/html.ts'
import { BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { PublicUrl } from '../../src/public-url.ts'
import { Doi } from '../../src/types/Doi.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { expect, test } from '../base.ts'

test('HTML looks right', async ({ page }) => {
  const email = await Effect.runPromise(
    Effect.provide(_.CreateEmail({ requester, review }), Layer.succeed(PublicUrl, publicUrl)),
  )

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('text looks right', { tag: '@text' }, async () => {
  const email = await Effect.runPromise(
    Effect.provide(_.CreateEmail({ requester, review }), Layer.succeed(PublicUrl, publicUrl)),
  )

  expect(`${email.text}\n`).toMatchSnapshot()
})

const requester = {
  name: NonEmptyString('Josiah Carberry'),
  emailAddress: EmailAddress('jcarberry@example.com'),
} satisfies _.Requester

const review = {
  author: NonEmptyString('Jean-Baptiste Botul'),
  id: 12345,
  preprint: {
    id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
    title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
    language: 'en',
  },
} satisfies _.Review

const publicUrl = new URL('http://example.com')
