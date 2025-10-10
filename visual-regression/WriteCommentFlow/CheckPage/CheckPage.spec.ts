import { Option } from 'effect'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'
import type { User } from '../../../src/user.ts'
import * as _ from '../../../src/WriteCommentFlow/CheckPage/CheckPage.ts'
import { expect, test } from '../../base.ts'

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
    competingInterests: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
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
  name: NonEmptyString.NonEmptyString('Josiah Carberry'),
  orcid: OrcidId('0000-0002-1825-0097'),
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
