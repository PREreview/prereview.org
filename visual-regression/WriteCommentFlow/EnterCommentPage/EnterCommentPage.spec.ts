import { Either } from 'effect'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { Uuid } from '../../../src/types/index.ts'
import * as EnterCommentForm from '../../../src/WriteCommentFlow/EnterCommentPage/EnterCommentForm.ts'
import * as _ from '../../../src/WriteCommentFlow/EnterCommentPage/EnterCommentPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.EnterCommentPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new EnterCommentForm.EmptyForm(),
    locale: DefaultLocale,
    prereviewId: 10779310,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a comment', async ({ showPage }) => {
  const response = _.EnterCommentPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new EnterCommentForm.CompletedForm({ comment }),
    locale: DefaultLocale,
    prereviewId: 10779310,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the comment is missing', async ({ showPage }) => {
  const response = _.EnterCommentPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    form: new EnterCommentForm.InvalidForm({ comment: Either.left(new EnterCommentForm.Missing()) }),
    locale: DefaultLocale,
    prereviewId: 10779310,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const comment = html`
  <h1>Lorem ipsum</h1>
  <p>Dolor sit amet, consectetur <strong>adipiscing</strong> <em>elit</em>.</p>
  <ul>
    <li>Aenean eget velit quis sapien gravida efficitur et vitae felis.</li>
    <li>
      <ol>
        <li>Etiam libero justo, vulputate sit amet turpis non, sollicitudin ornare velit.</li>
        <li>Mauris vel lorem ac erat pulvinar sollicitudin.</li>
        <li>
          Vestibulum auctor, augue et bibendum blandit, massa est ullamcorper libero, eget finibus justo sem eget elit.
        </li>
      </ol>
    </li>
  </ul>
  <h2>Quisque sed venenatis arcu</h2>
  <p>
    Aliquam non enim cursus, dictum quam vel, volutpat ex. Pellentesque posuere quam tellus, sit amet scelerisque sem
    interdum non. Pellentesque eget luctus lorem. Aliquam vel lobortis metus, fringilla elementum nisi. Phasellus eu
    felis ac nulla posuere posuere. Vivamus et elit bibendum, luctus nibh quis, aliquet lacus. Phasellus imperdiet nibh
    sit amet ante porttitor lacinia. Morbi tristique placerat massa at cursus. In condimentum purus quis ex dapibus
    scelerisque. Nulla augue mauris, sollicitudin a diam vel, semper porttitor sapien.
  </p>
`
