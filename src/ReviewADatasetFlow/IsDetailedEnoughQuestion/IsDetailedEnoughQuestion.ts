import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../response.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/uuid.ts'
import type { IsDetailedEnoughForm } from './IsDetailedEnoughForm.ts'

export const IsDetailedEnoughQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: IsDetailedEnoughForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Is the dataset granular enough to be a reliable standard of measurement?`,
    nav: html`
      <a href="${Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId })}" class="back"
        ><span>Back</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.isDetailedEnough)
                    ? html`
                        <li>
                          <a href="#is-detailed-enough-yes">
                            ${pipe(
                              Match.value(form.isDetailedEnough.left),
                              Match.tag('Missing', () => 'Select if the dataset is granular enough'),
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
              form._tag === 'InvalidForm' && Either.isLeft(form.isDetailedEnough)
                ? 'aria-invalid="true" aria-errormessage="is-detailed-enough-error"'
                : '',
            )}
          >
            <legend>
              <h1>Is the dataset granular enough to be a reliable standard of measurement?</h1>
            </legend>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.isDetailedEnough)
              ? html`
                  <div class="error-message" id="is-detailed-enough-error">
                    <span class="visually-hidden">Error:</span>
                    ${Match.valueTags(form.isDetailedEnough.left, {
                      Missing: () => 'Select if the dataset is granular enough',
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="isDetailedEnough"
                    id="is-detailed-enough-yes"
                    type="radio"
                    value="yes"
                    aria-describedby="is-detailed-enough-tip-yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isDetailedEnough: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
                <p id="is-detailed-enough-tip-yes" role="note">
                  The dataset provides data at a detailed or granular enough level to seem trustworthy as a standard of
                  measurement or truth.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="isDetailedEnough"
                    type="radio"
                    value="partly"
                    aria-describedby="is-detailed-enough-tip-partly"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isDetailedEnough: 'partly' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Partly</span>
                </label>
                <p id="is-detailed-enough-tip-partly" role="note">
                  Some of the data in the dataset provides data at a detailed or granular enough level to seem
                  trustworthy as a standard of measurement or truth, but not all of it.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="isDetailedEnough"
                    type="radio"
                    value="no"
                    aria-describedby="is-detailed-enough-tip-no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isDetailedEnough: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
                <p id="is-detailed-enough-tip-no" role="note">
                  The dataset doesn’t provide data at a detailed or granular enough level to seem trustworthy as a
                  standard of measurement or truth.
                </p>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input
                    name="isDetailedEnough"
                    type="radio"
                    value="unsure"
                    aria-describedby="is-detailed-enough-tip-unsure"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isDetailedEnough: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
