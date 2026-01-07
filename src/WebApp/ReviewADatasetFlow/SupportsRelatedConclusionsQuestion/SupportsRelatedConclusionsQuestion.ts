import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { SupportsRelatedConclusionsForm } from './SupportsRelatedConclusionsForm.ts'

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
          <conditional-inputs>
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
                      aria-controls="supports-related-conclusions-yes-control"
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
                  <div class="conditional" id="supports-related-conclusions-yes-control">
                    <div>
                      <label for="supports-related-conclusions-yes-detail" class="textarea"
                        >How does it support the conclusions? (optional)</label
                      >
                      <textarea
                        name="supportsRelatedConclusionsYesDetail"
                        id="supports-related-conclusions-yes-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.supportsRelatedConclusionsYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.supportsRelatedConclusionsYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="supportsRelatedConclusions"
                      type="radio"
                      value="partly"
                      aria-describedby="supports-related-conclusions-tip-partly"
                      aria-controls="supports-related-conclusions-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'partly' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Partly</span>
                  </label>
                  <p id="supports-related-conclusions-tip-partly" role="note">
                    This dataset supports some of the researcher’s conclusions about it—or is likely to support some
                    clear conclusions—but does not clearly support some of the researcher’s conclusions or is unlikely
                    to do so because of minor issues.
                  </p>
                  <div class="conditional" id="supports-related-conclusions-partly-control">
                    <div>
                      <label for="supports-related-conclusions-partly-detail" class="textarea"
                        >How does it partly support the conclusions? (optional)</label
                      >
                      <textarea
                        name="supportsRelatedConclusionsPartlyDetail"
                        id="supports-related-conclusions-partly-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.supportsRelatedConclusionsPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.supportsRelatedConclusionsPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="supportsRelatedConclusions"
                      type="radio"
                      value="no"
                      aria-describedby="supports-related-conclusions-tip-no"
                      aria-controls="supports-related-conclusions-no-control"
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
                  <div class="conditional" id="supports-related-conclusions-no-control">
                    <div>
                      <label for="supports-related-conclusions-no-detail" class="textarea"
                        >How does it not support the conclusions? (optional)</label
                      >
                      <textarea
                        name="supportsRelatedConclusionsNoDetail"
                        id="supports-related-conclusions-no-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.supportsRelatedConclusionsNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.supportsRelatedConclusionsNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
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
          </conditional-inputs>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}
