import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { Uuid } from '../../../src/types/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'
import type { User } from '../../../src/user.ts'
import * as ChoosePersonaForm from '../../../src/WebApp/WriteCommentFlow/ChoosePersonaPage/ChoosePersonaForm.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/ChoosePersonaPage/ChoosePersonaPage.ts'
import { expect, test } from '../../base.ts'

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
  orcid: OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User
