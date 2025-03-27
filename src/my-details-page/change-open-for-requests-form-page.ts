import { identity, type Option } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../html.js'
import type { IsOpenForRequests } from '../is-open-for-requests.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeOpenForRequestsMatch, myDetailsMatch } from '../routes.js'

export const createFormPage = ({
  locale,
  openForRequests,
  error = false,
}: {
  locale: SupportedLocale
  openForRequests: Option.Option<IsOpenForRequests>
  error?: boolean
}) =>
  PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText(translate(locale, 'my-details', 'happyTakeRequests')({ error: error ? identity : () => '' })),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'my-details', 'back')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeOpenForRequestsMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'my-details', 'thereIsAProblem')()}</h2>
                <ul>
                  <li>
                    <a href="#open-for-requests-yes"
                      >${translate(locale, 'my-details', 'selectHappyTakeRequestsError')({ error: () => '' })}</a
                    >
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
              <h1>${translate(locale, 'my-details', 'happyTakeRequests')({ error: () => '' })}</h1>
            </legend>

            ${error
              ? html`
                  <div class="error-message" id="open-for-requests-error">
                    ${rawHtml(
                      translate(locale, 'my-details', 'selectHappyTakeRequestsError')({ error: visuallyHidden }),
                    )}
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
                  <span>${translate(locale, 'my-details', 'yes')()}</span>
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
                  <span>${translate(locale, 'my-details', 'no')()}</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${translate(locale, 'my-details', 'saveAndContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeOpenForRequestsMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })

const visuallyHidden = (text: string) => html`<span class="visually-hidden">${text}</span>`.toString()
