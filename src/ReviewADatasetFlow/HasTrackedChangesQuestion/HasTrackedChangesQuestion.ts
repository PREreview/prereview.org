import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { Uuid } from '../../types/uuid.js'
import type { HasTrackedChangesForm } from './HasTrackedChangesForm.js'

export const HasTrackedChangesQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: HasTrackedChangesForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?`,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.hasTrackedChanges)
                    ? html`
                        <li>
                          <a href="#has-tracked-changes-yes">
                            ${pipe(
                              Match.value(form.hasTrackedChanges.left),
                              Match.tag(
                                'Missing',
                                () => 'Select if the dataset has a way to list or track changes or versions',
                              ),
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
              form._tag === 'InvalidForm' && Either.isLeft(form.hasTrackedChanges)
                ? 'aria-invalid="true" aria-errormessage="has-tracked-changes-error"'
                : '',
            )}
          >
            <legend>
              <h1>
                Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?
              </h1>
            </legend>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.hasTrackedChanges)
              ? html`
                  <div class="error-message" id="has-tracked-changes-error">
                    <span class="visually-hidden">Error:</span>
                    ${Match.valueTags(form.hasTrackedChanges.left, {
                      Missing: () => 'Select if the dataset has a way to list or track changes or versions',
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="hasTrackedChanges"
                    id="has-tracked-changes-yes"
                    type="radio"
                    value="yes"
                    aria-describedby="has-tracked-changes-tip-yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasTrackedChanges: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
                <p id="has-tracked-changes-tip-yes" role="note">
                  The dataset has a clear version history that appears to be accurate and up-to-date.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="hasTrackedChanges"
                    type="radio"
                    value="partly"
                    aria-describedby="has-tracked-changes-tip-partly"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasTrackedChanges: 'partly' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Partly</span>
                </label>
                <p id="has-tracked-changes-tip-partly" role="note">
                  The dataset includes a way to list or track changes or versions, but it doesn’t seem to be accurate or
                  current.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="hasTrackedChanges"
                    type="radio"
                    value="no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasTrackedChanges: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input
                    name="hasTrackedChanges"
                    type="radio"
                    value="unsure"
                    aria-describedby="has-tracked-changes-tip-unsure"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasTrackedChanges: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
