import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html'
import { PageResponse } from '../response'
import { requestAPrereviewMatch } from '../routes'

export const requestAPrereviewPage = PageResponse({
  status: Status.OK,
  title: plainText`Which preprint would you like reviewed?`,
  main: html`
    <form method="post" action="${format(requestAPrereviewMatch.formatter, {})}" novalidate>
      <h1><label id="preprint-label" for="preprint">Which preprint would you like reviewed?</label></h1>

      <p id="preprint-tip" role="note">Use the preprint DOI or URL.</p>

      <details>
        <summary><span>What is a DOI?</span></summary>

        <div>
          <p>
            A <a href="https://www.doi.org/"><dfn>DOI</dfn></a> is a unique identifier that you can find on many
            preprints. For example, <q class="select-all" translate="no">10.1101/2022.10.06.511170</q> or
            <q class="select-all" translate="no">https://doi.org/10.1101/2022.10.06.511170</q>.
          </p>
        </div>
      </details>

      <input id="preprint" name="preprint" type="text" size="60" spellcheck="false" aria-describedby="preprint-tip" />

      <button>Continue</button>
    </form>
  `,
  skipToLabel: 'form',
  canonical: format(requestAPrereviewMatch.formatter, {}),
})
