import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/uuid.ts'
import type { HasDataCensoredOrDeletedForm } from './HasDataCensoredOrDeletedForm.ts'

export const HasDataCensoredOrDeletedQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: HasDataCensoredOrDeletedForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Does this dataset show signs of alteration beyond instances of likely human error, such as censorship, deletion, or redaction, that are not accounted for otherwise?`,
    nav: html`
      <a href="${Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId })}" class="back">
        <span>Back</span>
      </a>
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId })}"
        novalidate
      >
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.hasDataCensoredOrDeleted)
                    ? html`
                        <li>
                          <a href="#has-data-censored-or-deleted-yes">
                            ${pipe(
                              Match.value(form.hasDataCensoredOrDeleted.left),
                              Match.tag('Missing', () => 'Select if the dataset shows signs of alteration'),
                              Match.exhaustive,
                            )}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <fieldset
            role="group"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.hasDataCensoredOrDeleted)
                ? 'aria-invalid="true" aria-errormessage="has-data-censored-or-deleted-error"'
                : '',
            )}
          >
            <legend>
              <h1>
                Does this dataset show signs of alteration beyond instances of likely human error, such as censorship,
                deletion, or redaction, that are not accounted for otherwise?
              </h1>
            </legend>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.hasDataCensoredOrDeleted)
              ? html`
                  <div class="error-message" id="has-data-censored-or-deleted-error">
                    <span class="visually-hidden">Error:</span>
                    ${Match.valueTags(form.hasDataCensoredOrDeleted.left, {
                      Missing: () => 'Select if the dataset shows signs of alteration',
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="hasDataCensoredOrDeleted"
                    id="has-data-censored-or-deleted-yes"
                    type="radio"
                    value="yes"
                    aria-describedby="has-data-censored-or-deleted-tip-yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasDataCensoredOrDeleted: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
                <p id="has-data-censored-or-deleted-tip-yes" role="note">
                  The dataset shows clear signs of alteration that are not accounted for by records of its versioning;
                  some kind of censorship, deletion, or redaction is evident throughout.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="hasDataCensoredOrDeleted"
                    type="radio"
                    value="partly"
                    aria-describedby="has-data-censored-or-deleted-tip-partly"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasDataCensoredOrDeleted: 'partly' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Partly</span>
                </label>
                <p id="has-data-censored-or-deleted-tip-partly" role="note">
                  Some parts of this dataset show signs of alterations that are not accounted for by records of its
                  versioning; some kind of censorship, deletion, or redaction is evident throughout.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="hasDataCensoredOrDeleted"
                    type="radio"
                    value="no"
                    aria-describedby="has-data-censored-or-deleted-tip-no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasDataCensoredOrDeleted: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
                <p id="has-data-censored-or-deleted-tip-no" role="note">
                  The dataset does not show obvious signs of alteration.
                </p>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input
                    name="hasDataCensoredOrDeleted"
                    type="radio"
                    value="unsure"
                    aria-describedby="has-data-censored-or-deleted-tip-unsure"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasDataCensoredOrDeleted: 'unsure' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>I don’t know</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
