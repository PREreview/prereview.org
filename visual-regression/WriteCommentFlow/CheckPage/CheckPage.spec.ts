import { Option } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import { NonEmptyString, Uuid } from '../../../src/types/index.js'
import { Pseudonym } from '../../../src/types/Pseudonym.js'
import type { User } from '../../../src/user.js'
import * as _ from '../../../src/WriteCommentFlow/CheckPage/CheckPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.CheckPage({
    competingInterests: Option.none(),
    comment,
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    locale: DefaultLocale,
    persona: 'public',
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right using a pseudonym', async ({ showPage }) => {
  const response = _.CheckPage({
    competingInterests: Option.none(),
    comment,
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    locale: DefaultLocale,
    persona: 'pseudonym',
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with competing interests', async ({ showPage }) => {
  const response = _.CheckPage({
    competingInterests: Option.some(
      NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    ),
    comment,
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    locale: DefaultLocale,
    persona: 'public',
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const user = {
  name: 'Josiah Carberry',
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User

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
