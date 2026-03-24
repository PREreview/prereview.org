import { Either, Match, pipe } from 'effect'
import { html, plainText } from '../../../html.ts'
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const t = translate(locale, 'review-a-dataset-flow')

  return PageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe('Which dataset are you reviewing?', errorPrefix(locale, hasAnError), plainText),
    main: html`
      <form method="post" action="${Routes.ReviewADataset}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <h1>
            <label id="which-dataset-label" for="which-dataset">Which dataset are you reviewing?</label>
          </h1>

          <p id="which-dataset-tip" role="note">Use the dataset DOI or URL.</p>

          <details>
            <summary><span>What is a DOI?</span></summary>

            <div>
              <p>
                A <a href="https://www.doi.org/"><dfn>DOI</dfn></a> is a unique identifier that you can find on many
                datasets. For example, <q class="select-all" translate="no">10.5061/dryad.wstqjq2n3</q> or
                <q class="select-all" translate="no">https://doi.org/10.5061/dryad.wstqjq2n3</q>.
              </p>
            </div>
          </details>

          ${hasAnError && Either.isLeft(form.whichDataset)
            ? html`
                <div class="error-message" id="which-dataset-error">
                  <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.whichDataset.left, {
                    Invalid: () => 'Enter a dataset DOI or URL',
                    Missing: () => 'Enter the dataset DOI or URL',
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

        <button>Continue</button>
      </form>
    `,
    canonical: Routes.ReviewADataset,
    js: hasAnError ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toErrorItems = (locale: SupportedLocale) => (form: ReviewADatasetForm.InvalidForm) => html`
  ${Either.isLeft(form.whichDataset)
    ? html`
        <li>
          <a href="#which-dataset">
            ${Match.valueTags(form.whichDataset.left, {
              Invalid: () => 'Enter a dataset DOI or URL',
              Missing: () => 'Enter the dataset DOI or URL',
            })}
          </a>
        </li>
      `
    : ''}
`
