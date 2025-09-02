import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { Uuid } from '../../types/uuid.js'
import type { SupportsRelatedConclusionsForm } from './SupportsRelatedConclusionsForm.js'

export const SupportsRelatedConclusionsQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: SupportsRelatedConclusionsForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Does this dataset support the researcher’s stated conclusions?`,
    nav: html`
      <a href="${Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId })}" class="back"
        ><span>Back</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId })}"
        novalidate
      >
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.supportsRelatedConclusions)
                    ? html`
                        <li>
                          <a href="#supports-related-conclusions-yes">
                            ${pipe(
                              Match.value(form.supportsRelatedConclusions.left),
                              Match.tag('Missing', () => 'Select if the dataset supports the conclusions'),
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
              form._tag === 'InvalidForm' && Either.isLeft(form.supportsRelatedConclusions)
                ? 'aria-invalid="true" aria-errormessage="supports-related-conclusions-error"'
                : '',
            )}
          >
            <legend>
              <h1>Does this dataset support the researcher’s stated conclusions?</h1>
            </legend>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.supportsRelatedConclusions)
              ? html`
                  <div class="error-message" id="supports-related-conclusions-error">
                    <span class="visually-hidden">Error:</span>
                    ${Match.valueTags(form.supportsRelatedConclusions.left, {
                      Missing: () => 'Select if the dataset supports the conclusions',
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="supportsRelatedConclusions"
                    id="supports-related-conclusions-yes"
                    type="radio"
                    value="yes"
                    aria-describedby="supports-related-conclusions-tip-yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
                <p id="supports-related-conclusions-tip-yes" role="note">
                  This dataset clearly supports the researcher’s conclusions about it—or is likely to support clear
                  conclusions—and does not require creative interpretation or overreach to do so.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="supportsRelatedConclusions"
                    type="radio"
                    value="partly"
                    aria-describedby="supports-related-conclusions-tip-partly"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'partly' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Partly</span>
                </label>
                <p id="supports-related-conclusions-tip-partly" role="note">
                  This dataset supports some of the researcher’s conclusions about it—or is likely to support some clear
                  conclusions—but does not clearly support some of the researcher’s conclusions or is unlikely to do so
                  because of minor issues.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="supportsRelatedConclusions"
                    type="radio"
                    value="no"
                    aria-describedby="supports-related-conclusions-tip-no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
                <p id="supports-related-conclusions-tip-no" role="note">
                  This dataset does not support the researcher’s conclusions about it—or it is unlikely to support any
                  clear conclusions—without flawed analysis or overreach.
                </p>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input
                    name="supportsRelatedConclusions"
                    type="radio"
                    value="unsure"
                    aria-describedby="supports-related-conclusions-tip-unsure"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
