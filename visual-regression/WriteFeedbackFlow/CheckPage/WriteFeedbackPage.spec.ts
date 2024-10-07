import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import type { Uuid } from '../../../src/types/index.js'
import * as _ from '../../../src/WriteFeedbackFlow/CheckPage/CheckPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.CheckPage({
    feedback,
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const feedback = html`
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