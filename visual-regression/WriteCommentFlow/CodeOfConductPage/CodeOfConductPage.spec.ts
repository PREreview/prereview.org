import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.js'
import { Uuid } from '../../../src/types/index.js'
import * as CodeOfConductForm from '../../../src/WriteCommentFlow/CodeOfConductPage/CodeOfConductForm.js'
import * as _ from '../../../src/WriteCommentFlow/CodeOfConductPage/CodeOfConductPage.js'
import { expect, test } from '../../base.js'

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
