import type { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../html.js'
import type { IsOpenForRequests } from '../is-open-for-requests.js'
import { PageResponse } from '../response.js'
import { changeOpenForRequestsMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = ({
  openForRequests,
  error = false,
}: {
  openForRequests: Option.Option<IsOpenForRequests>
  error?: boolean
}) =>
  PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Are you happy to take requests for a PREreview?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>Back</span></a>`,
    main: html`
      <form method="post" action="${format(changeOpenForRequestsMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  <li>
                    <a href="#open-for-requests-yes">Select yes if you are happy to take requests for a PREreview</a>
                  </li>
                </ul>
              </error-summary>
            `
          : ''}

        <div ${error ? rawHtml('class="error"') : ''}>
          <fieldset
            role="group"
            ${error ? rawHtml('aria-invalid="true" aria-errormessage="open-for-requests-error"') : ''}
          >
            <legend>
              <h1>Are you happy to take requests for a PREreview?</h1>
            </legend>

            ${error
              ? html`
                  <div class="error-message" id="open-for-requests-error">
                    <span class="visually-hidden">Error:</span>
                    Select yes if you are happy to take requests for a PREreview
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="openForRequests"
                    type="radio"
                    value="yes"
                    id="open-for-requests-yes"
                    ${match(openForRequests)
                      .with({ value: { value: true } }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Yes</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="openForRequests"
                    type="radio"
                    value="no"
                    ${match(openForRequests)
                      .with({ value: { value: false } }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>No</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeOpenForRequestsMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
