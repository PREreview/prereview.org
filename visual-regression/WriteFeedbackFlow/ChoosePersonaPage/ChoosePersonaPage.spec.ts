import { Either } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { DefaultLocale } from '../../../src/locales/index.js'
import type { Uuid } from '../../../src/types/index.js'
import type { Pseudonym } from '../../../src/types/pseudonym.js'
import type { User } from '../../../src/user.js'
import * as ChoosePersonaForm from '../../../src/WriteFeedbackFlow/ChoosePersonaPage/ChoosePersonaForm.js'
import * as _ from '../../../src/WriteFeedbackFlow/ChoosePersonaPage/ChoosePersonaPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.ChoosePersonaPage({
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    form: new ChoosePersonaForm.EmptyForm(),
    locale: DefaultLocale,
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a persona', async ({ showPage }) => {
  const response = _.ChoosePersonaPage({
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    form: new ChoosePersonaForm.CompletedForm({ persona: 'public' }),
    locale: DefaultLocale,
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the persona is missing', async ({ showPage }) => {
  const response = _.ChoosePersonaPage({
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    form: new ChoosePersonaForm.InvalidForm({ persona: Either.left(new ChoosePersonaForm.Missing()) }),
    locale: DefaultLocale,
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const user = {
  name: 'Josiah Carberry',
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User
