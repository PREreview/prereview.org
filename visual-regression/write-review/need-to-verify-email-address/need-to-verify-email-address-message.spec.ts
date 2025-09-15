import { UnverifiedContactEmailAddress } from '../../../src/contact-email-address.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import { type PreprintTitle, BiorxivPreprintId } from '../../../src/Preprints/index.js'
import { Doi, EmailAddress, Uuid } from '../../../src/types/index.js'
import { needToVerifyEmailAddressMessage } from '../../../src/write-review/need-to-verify-email-address/need-to-verify-email-address-message.js'
import { expect, test } from '../../base.js'

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
