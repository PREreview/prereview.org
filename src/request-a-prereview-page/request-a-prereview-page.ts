import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { homeMatch, requestAPrereviewMatch } from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type * as Form from './form.js'

export const requestAPrereviewPage = (form: Form.IncompleteForm, locale: SupportedLocale) => {
  const error = form._tag === 'InvalidForm'
  const t = translate(locale)

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: pipe(t('request-a-prereview-page', 'requestTitle')(), errorPrefix(locale, error), plainText),
    nav: html`<a href="${format(homeMatch.formatter, {})}" class="back"><span>${t('forms', 'backLink')()}</span></a>`,
    main: html`
      <form method="post" action="${format(requestAPrereviewMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${t('forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  <li>
                    <a href="#preprint">${t('request-a-prereview-page', 'errorEnterPreprint')()}</a>
                  </li>
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(error ? 'class="error"' : '')}>
          <h1>
            <label id="preprint-label" for="preprint">${t('request-a-prereview-page', 'requestTitle')()}</label>
          </h1>

          <p id="preprint-tip" role="note">${t('request-a-prereview-page', 'useDoiUrl')()}</p>

          <details>
            <summary><span>${t('request-a-prereview-page', 'whatIsDoi')()}</span></summary>

            <div>
              <p>
                ${rawHtml(
                  t(
                    'request-a-prereview-page',
                    'whatIsDoiText',
                  )({
                    doi: text => html`<a href="https://www.doi.org/"><dfn>${text}</dfn></a>`.toString(),
                    example: html`<q class="select-all" translate="no">10.1101/2022.10.06.511170</q>`.toString(),
                    exampleUrl: html`<q class="select-all" translate="no"
                      >https://doi.org/10.1101/2022.10.06.511170</q
                    >`.toString(),
                  }),
                )}
              </p>
            </div>
          </details>

          ${error
            ? html`
                <div class="error-message" id="preprint-error">
                  <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                  ${t('request-a-prereview-page', 'errorEnterPreprint')()}
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

        <button>${t('forms', 'continueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(requestAPrereviewMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}
