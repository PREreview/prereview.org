import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/uuid.ts'
import type { FollowsFairAndCarePrinciplesForm } from './FollowsFairAndCarePrinciplesForm.ts'

export const FollowsFairAndCarePrinciplesQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: FollowsFairAndCarePrinciplesForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Does this dataset follow FAIR and CARE principles?`,
    nav: html`
      <a href="${Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId })}" class="back">
        <span>Back</span>
      </a>
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId })}"
        novalidate
      >
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.followsFairAndCarePrinciples)
                    ? html`
                        <li>
                          <a href="#follows-fair-and-care-principles-yes">
                            ${pipe(
                              Match.value(form.followsFairAndCarePrinciples.left),
                              Match.tag('Missing', () => 'Select if the dataset follows FAIR and CARE principles'),
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
              form._tag === 'InvalidForm' && Either.isLeft(form.followsFairAndCarePrinciples)
                ? 'aria-invalid="true" aria-errormessage="findings-next-steps-error"'
                : '',
            )}
          >
            <legend>
              <h1>Does this dataset follow FAIR and CARE principles?</h1>
            </legend>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.followsFairAndCarePrinciples)
              ? html`
                  <div class="error-message" id="findings-next-steps-error">
                    <span class="visually-hidden">Error:</span>
                    ${Match.valueTags(form.followsFairAndCarePrinciples.left, {
                      Missing: () => 'Select if the dataset follows FAIR and CARE principles',
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="followsFairAndCarePrinciples"
                    id="follows-fair-and-care-principles-yes"
                    type="radio"
                    value="yes"
                    aria-describedby="follows-fair-and-care-principles-tip-yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', followsFairAndCarePrinciples: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
                <p id="follows-fair-and-care-principles-tip-yes" role="note">
                  The dataset has enough metadata and follows the FAIR and CARE principles.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="followsFairAndCarePrinciples"
                    type="radio"
                    value="partly"
                    aria-describedby="follows-fair-and-care-principles-tip-partly"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', followsFairAndCarePrinciples: 'partly' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Partly</span>
                </label>
                <p id="follows-fair-and-care-principles-tip-partly" role="note">
                  The dataset has some metadata and follows some FAIR and CARE principles, but minor problems exist.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="followsFairAndCarePrinciples"
                    type="radio"
                    value="no"
                    aria-describedby="follows-fair-and-care-principles-tip-no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', followsFairAndCarePrinciples: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
                <p id="follows-fair-and-care-principles-tip-no" role="note">
                  The dataset lacks enough metadata and does not follow the FAIR and CARE principles.
                </p>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input
                    name="followsFairAndCarePrinciples"
                    type="radio"
                    value="unsure"
                    aria-describedby="follows-fair-and-care-principles-tip-unsure"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', followsFairAndCarePrinciples: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
