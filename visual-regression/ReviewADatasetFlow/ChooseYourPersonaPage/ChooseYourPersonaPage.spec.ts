import { Either } from 'effect'
import * as Personas from '../../../src/Personas/index.js'
import * as ChooseYourPersonaForm from '../../../src/ReviewADatasetFlow/ChooseYourPersonaPage/ChooseYourPersonaForm.js'
import * as _ from '../../../src/ReviewADatasetFlow/ChooseYourPersonaPage/ChooseYourPersonaPage.js'
import { NonEmptyString, Orcid, Pseudonym, Uuid } from '../../../src/types/index.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.ChooseYourPersonaPage({
    datasetReviewId,
    form: new ChooseYourPersonaForm.EmptyForm(),
    publicPersona,
    pseudonymPersona,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a choice', async ({ showPage }) => {
  const response = _.ChooseYourPersonaPage({
    datasetReviewId,
    form: new ChooseYourPersonaForm.CompletedForm({ chooseYourPersona: 'public' }),
    publicPersona,
    pseudonymPersona,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the choice is missing', async ({ showPage }) => {
  const response = _.ChooseYourPersonaPage({
    datasetReviewId,
    form: new ChooseYourPersonaForm.InvalidForm({
      chooseYourPersona: Either.left(new ChooseYourPersonaForm.Missing()),
    }),
    publicPersona,
    pseudonymPersona,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')

const publicPersona = new Personas.PublicPersona({
  orcidId: Orcid.Orcid('0000-0002-1825-0097'),
  name: NonEmptyString.NonEmptyString('Josiah Carberry'),
})

const pseudonymPersona = new Personas.PseudonymPersona({
  pseudonym: Pseudonym.Pseudonym('Orange Panda'),
})
