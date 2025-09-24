import { UnverifiedContactEmailAddress } from '../../../src/contact-email-address.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { Doi, EmailAddress, Uuid } from '../../../src/types/index.ts'
import { needToVerifyEmailAddressMessage } from '../../../src/write-review/need-to-verify-email-address/need-to-verify-email-address-message.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = needToVerifyEmailAddressMessage({ contactEmailAddress, locale, preprint })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const contactEmailAddress = new UnverifiedContactEmailAddress({
  value: EmailAddress.EmailAddress('jcarberry@example.com'),
  verificationToken: Uuid.Uuid('224d8877-d59f-409f-aed0-5157df78357f'),
})

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi.Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
