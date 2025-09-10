import { Either } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { DefaultLocale } from '../../../src/locales/index.js'
import { Uuid } from '../../../src/types/index.js'
import { NonEmptyString } from '../../../src/types/NonEmptyString.js'
import { Pseudonym } from '../../../src/types/Pseudonym.js'
import type { User } from '../../../src/user.js'
import * as ChoosePersonaForm from '../../../src/WriteCommentFlow/ChoosePersonaPage/ChoosePersonaForm.js'
import * as _ from '../../../src/WriteCommentFlow/ChoosePersonaPage/ChoosePersonaPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.ChoosePersonaPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new ChoosePersonaForm.EmptyForm(),
    locale: DefaultLocale,
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a persona', async ({ showPage }) => {
  const response = _.ChoosePersonaPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new ChoosePersonaForm.CompletedForm({ persona: 'public' }),
    locale: DefaultLocale,
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the persona is missing', async ({ showPage }) => {
  const response = _.ChoosePersonaPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new ChoosePersonaForm.InvalidForm({ persona: Either.left(new ChoosePersonaForm.Missing()) }),
    locale: DefaultLocale,
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const user = {
  name: NonEmptyString('Josiah Carberry'),
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User
