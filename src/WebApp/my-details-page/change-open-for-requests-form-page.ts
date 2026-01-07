import { pipe, type Option } from 'effect'
import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../../html.ts'
import type { IsOpenForRequests } from '../../is-open-for-requests.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import { changeOpenForRequestsMatch, myDetailsMatch } from '../../routes.ts'
import { errorPrefix } from '../../shared-translation-elements.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

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
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(translate(locale, 'my-details', 'happyTakeRequests')(), errorPrefix(locale, error), plainText),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeOpenForRequestsMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  <li>
                    <a href="#open-for-requests-yes"
                      >${translate(locale, 'my-details', 'selectHappyTakeRequestsError')()}</a
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
              <h1>${translate(locale, 'my-details', 'happyTakeRequests')()}</h1>
            </legend>

            ${error
              ? html`
                  <div class="error-message" id="open-for-requests-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${translate(locale, 'my-details', 'selectHappyTakeRequestsError')()}
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeOpenForRequestsMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
