import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { Uuid } from '../../../src/types/index.ts'
import * as CodeOfConductForm from '../../../src/WebApp/WriteCommentFlow/CodeOfConductPage/CodeOfConductForm.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/CodeOfConductPage/CodeOfConductPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.CodeOfConductPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new CodeOfConductForm.EmptyForm(),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the agreement is missing', async ({ showPage }) => {
  const response = _.CodeOfConductPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new CodeOfConductForm.InvalidForm({ agree: Either.left(new CodeOfConductForm.Missing()) }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
