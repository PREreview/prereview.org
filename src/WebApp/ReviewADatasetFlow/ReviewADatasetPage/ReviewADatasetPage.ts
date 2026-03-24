import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'
import type * as ReviewADatasetForm from './ReviewADatasetForm.ts'

export const ReviewADatasetPage = ({
  form,
  locale,
}: {
  form: ReviewADatasetForm.IncompleteForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return PageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('whichDataset')(), errorPrefix(locale, hasAnError), plainText),
    main: html`
      <form method="post" action="${Routes.ReviewADataset}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <h1>
            <label id="which-dataset-label" for="which-dataset">${t('whichDataset')()}</label>
          </h1>

          <p id="which-dataset-tip" role="note">${t('useDoiUrl')()}</p>

          <details>
            <summary><span>${t('whatIsDoi')()}</span></summary>

            <div>
              <p>
                ${rawHtml(
                  t('whatIsDoiText')({
                    doi: text => html`<a href="https://www.doi.org/"><dfn>${text}</dfn></a>`.toString(),
                    example: html`<q class="select-all" translate="no">10.5061/dryad.wstqjq2n3</q>`.toString(),
                    exampleUrl: html`<q class="select-all" translate="no"
                      >https://doi.org/10.5061/dryad.wstqjq2n3</q
                    >`.toString(),
                  }),
                )}
              </p>
            </div>
          </details>

          ${hasAnError && Either.isLeft(form.whichDataset)
            ? html`
                <div class="error-message" id="which-dataset-error">
                  <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.whichDataset.left, {
                    Invalid: () => t('errorEnterTheDataset')(),
                    Missing: () => t('errorEnterADataset')(),
                  })}
                </div>
              `
            : ''}

          <input
            name="whichDataset"
            id="which-dataset"
            type="text"
            size="60"
            spellcheck="false"
            aria-describedby="which-dataset-tip"
            ${hasAnError && Either.isLeft(form.whichDataset)
              ? html`aria-invalid="true" aria-errormessage="dataset-error"
                ${Match.valueTags(form.whichDataset.left, {
                  Invalid: ({ value }) => html`value="${value}"`,
                  Missing: () => '',
                })}`
              : ''}
          />
        </div>

        <button>${translate(locale, 'forms', 'continueButton')()}</button>
      </form>
    `,
    canonical: Routes.ReviewADataset,
    js: hasAnError ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: ReviewADatasetForm.InvalidForm) => html`
  ${Either.isLeft(form.whichDataset)
    ? html`
        <li>
          <a href="#which-dataset">
            ${Match.valueTags(form.whichDataset.left, {
              Invalid: () => translate(locale, 'review-a-dataset-flow', 'errorEnterTheDataset')(),
              Missing: () => translate(locale, 'review-a-dataset-flow', 'errorEnterADataset')(),
            })}
          </a>
        </li>
      `
    : ''}
`
