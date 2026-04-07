import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'
import type * as RequestAReviewForm from './RequestAReviewForm.ts'

export const RequestAPrereviewPage = (form: RequestAReviewForm.IncompleteForm, locale: SupportedLocale) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale)

  return PageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('request-a-prereview-page', 'requestTitle')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`<a href="${Routes.HomePage}" class="back"><span>${t('forms', 'backLink')()}</span></a>`,
    main: html`
      <form method="post" action="${Routes.RequestAReview}" novalidate>
        ${hasAnError
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${t('forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  <li>
                    <a href="#which-preprint">${t('request-a-prereview-page', 'errorEnterPreprint')()}</a>
                  </li>
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(hasAnError ? 'class="error"' : '')}>
          <h1>
            <label id="which-preprint-label" for="which-preprint"
              >${t('request-a-prereview-page', 'requestTitle')()}</label
            >
          </h1>

          <p id="which-preprint-tip" role="note">${t('request-a-prereview-page', 'useDoiUrl')()}</p>

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

          ${hasAnError && Either.isLeft(form.whichPreprint)
            ? html`
                <div class="error-message" id="which-preprint-error">
                  <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                  ${t('request-a-prereview-page', 'errorEnterPreprint')()}
                </div>
              `
            : ''}

          <input
            id="which-preprint"
            name="whichPreprint"
            type="text"
            size="60"
            spellcheck="false"
            aria-describedby="which-preprint-tip"
            ${hasAnError && Either.isLeft(form.whichPreprint)
              ? html`aria-invalid="true" aria-errormessage="which-preprint-error"
                ${Match.valueTags(form.whichPreprint.left, {
                  Invalid: ({ value }) => html`value="${value}"`,
                  Missing: () => '',
                })}`
              : ''}
          />
        </div>

        <button>${t('forms', 'continueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.RequestAReview,
    js: hasAnError ? ['error-summary.js'] : [],
  })
}
