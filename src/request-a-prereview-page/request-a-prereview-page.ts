import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html'
import { PageResponse } from '../response'
import { requestAPrereviewMatch } from '../routes'
import type * as Form from './form'

export const requestAPrereviewPage = (form: Form.IncompleteForm) => {
  const error = form._tag === 'InvalidForm'

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Which preprint would you like reviewed?`,
    main: html`
      <form method="post" action="${format(requestAPrereviewMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  <li>
                    <a href="#preprint">Enter the preprint DOI or URL</a>
                  </li>
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(error ? 'class="error"' : '')}>
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

          ${error
            ? html`
                <div class="error-message" id="preprint-error">
                  <span class="visually-hidden">Error:</span>
                  Enter the preprint DOI or URL
                </div>
              `
            : ''}

          <input
            id="preprint"
            name="preprint"
            type="text"
            size="60"
            spellcheck="false"
            aria-describedby="preprint-tip"
            ${error ? html`value="${form.value}"` : ''}
            ${error ? html`aria-invalid="true" aria-errormessage="preprint-error"` : ''}
          />
        </div>

        <button>Continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(requestAPrereviewMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}
