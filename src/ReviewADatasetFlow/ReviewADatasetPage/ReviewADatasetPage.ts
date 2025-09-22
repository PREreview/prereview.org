import { Either, Match } from 'effect'
import { html, plainText } from '../../html.js'
import { PageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import * as StatusCodes from '../../StatusCodes.js'
import type * as ReviewADatasetForm from './ReviewADatasetForm.js'

export const ReviewADatasetPage = ({ form }: { form: ReviewADatasetForm.IncompleteForm }) => {
  return PageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText(`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Which dataset are you reviewing?`),
    main: html`
      <form method="post" action="${Routes.ReviewADataset}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.whichDataset)
                    ? html`
                        <li>
                          <a href="#which-dataset">
                            ${Match.valueTags(form.whichDataset.left, {
                              Invalid: () => 'Enter a dataset DOI',
                              Missing: () => 'Enter the dataset DOI',
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <h1>
            <label id="which-dataset-label" for="which-dataset">Which dataset are you reviewing?</label>
          </h1>

          <p id="which-dataset-tip" role="note">Use the dataset DOI.</p>

          <details>
            <summary><span>What is a DOI?</span></summary>

            <div>
              <p>
                A <a href="https://www.doi.org/"><dfn>DOI</dfn></a> is a unique identifier that you can find on many
                datasets. For example, <q class="select-all" translate="no">10.1101/2022.10.06.511170</q> or
                <q class="select-all" translate="no">https://doi.org/10.1101/2022.10.06.511170</q>.
              </p>
            </div>
          </details>

          ${form._tag === 'InvalidForm' && Either.isLeft(form.whichDataset)
            ? html`
                <div class="error-message" id="which-dataset-error">
                  <span class="visually-hidden">Error:</span>
                  ${Match.valueTags(form.whichDataset.left, {
                    Invalid: () => 'Enter a dataset DOI',
                    Missing: () => 'Enter the dataset DOI',
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
            ${form._tag === 'InvalidForm' && Either.isLeft(form.whichDataset)
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
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
