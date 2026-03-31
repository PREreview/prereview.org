import { Doi } from 'doi-ts'
import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'
import type { User } from '../../../src/user.ts'
import * as ChooseYourPersonaForm from '../../../src/WebApp/RequestAReviewFlow/ChooseYourPersonaPage/ChooseYourPersonaForm.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/ChooseYourPersonaPage/ChooseYourPersonaPage.ts'
import { expect, test } from '../../base.ts'

const user = {
  name: NonEmptyString('Josiah Carberry'),
  orcid: OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User

const preprint = new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = _.ChooseYourPersonaPage({
    form: new ChooseYourPersonaForm.EmptyForm(),
    preprint,
    user,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = _.ChooseYourPersonaPage({
    form: new ChooseYourPersonaForm.InvalidForm({
      chooseYourPersona: Either.left(new ChooseYourPersonaForm.Missing()),
    }),
    preprint,
    user,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
