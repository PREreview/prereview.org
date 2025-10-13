import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/uuid.ts'
import type { IsAppropriateForThisKindOfResearchForm } from './IsAppropriateForThisKindOfResearchForm.ts'

export const IsAppropriateForThisKindOfResearchQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: IsAppropriateForThisKindOfResearchForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Is the dataset well-suited to support its stated research purpose?`,
    nav: html`
      <a href="${Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId })}" class="back"
        ><span>Back</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId })}"
        novalidate
      >
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.isAppropriateForThisKindOfResearch)
                    ? html`
                        <li>
                          <a href="#is-appropriate-for-this-kind-of-research-question-yes">
                            ${pipe(
                              Match.value(form.isAppropriateForThisKindOfResearch.left),
                              Match.tag('Missing', () => 'Select if the dataset is well-suited'),
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
                form._tag === 'InvalidForm' && Either.isLeft(form.isAppropriateForThisKindOfResearch)
                  ? 'aria-invalid="true" aria-errormessage="is-appropriate-for-this-kind-of-research-question-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Is the dataset well-suited to support its stated research purpose?</h1>
              </legend>

              ${form._tag === 'InvalidForm' && Either.isLeft(form.isAppropriateForThisKindOfResearch)
                ? html`
                    <div class="error-message" id="is-appropriate-for-this-kind-of-research-question-error">
                      <span class="visually-hidden">Error:</span>
                      ${Match.valueTags(form.isAppropriateForThisKindOfResearch.left, {
                        Missing: () => 'Select if the dataset is well-suited',
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="isAppropriateForThisKindOfResearch"
                      id="is-appropriate-for-this-kind-of-research-question-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-yes"
                      aria-controls="is-appropriate-for-this-kind-of-research-question-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'yes' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Yes</span>
                  </label>
                  <p id="is-appropriate-for-this-kind-of-research-question-tip-yes" role="note">
                    The way these data were collected, analyzed, and used is well-suited to support its stated research
                    purpose.
                  </p>
                  <div class="conditional" id="is-appropriate-for-this-kind-of-research-question-yes-control">
                    <div>
                      <label for="is-appropriate-for-this-kind-of-research-question-yes-detail" class="textarea"
                        >How is it well-suited? (optional)</label
                      >
                      <textarea
                        name="isAppropriateForThisKindOfResearchYesDetail"
                        id="is-appropriate-for-this-kind-of-research-question-yes-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isAppropriateForThisKindOfResearchYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.isAppropriateForThisKindOfResearchYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isAppropriateForThisKindOfResearch"
                      type="radio"
                      value="partly"
                      aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-partly"
                      aria-controls="is-appropriate-for-this-kind-of-research-question-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'partly' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Partly</span>
                  </label>
                  <p id="is-appropriate-for-this-kind-of-research-question-tip-partly" role="note">
                    The way these data were collected, analyzed, and used partly supports its stated research purpose,
                    but other questions, methods, or tools would have been better.
                  </p>
                  <div class="conditional" id="is-appropriate-for-this-kind-of-research-question-partly-control">
                    <div>
                      <label for="is-appropriate-for-this-kind-of-research-question-partly-detail" class="textarea"
                        >What would have been better? (optional)</label
                      >
                      <textarea
                        name="isAppropriateForThisKindOfResearchPartlyDetail"
                        id="is-appropriate-for-this-kind-of-research-question-partly-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isAppropriateForThisKindOfResearchPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.isAppropriateForThisKindOfResearchPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isAppropriateForThisKindOfResearch"
                      type="radio"
                      value="no"
                      aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-no"
                      aria-controls="is-appropriate-for-this-kind-of-research-question-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'no' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>No</span>
                  </label>
                  <p id="is-appropriate-for-this-kind-of-research-question-tip-no" role="note">
                    The way these data were collected, analyzed, and used is not well-suited for its stated research
                    purpose.
                  </p>
                  <div class="conditional" id="is-appropriate-for-this-kind-of-research-question-no-control">
                    <div>
                      <label for="is-appropriate-for-this-kind-of-research-question-no-detail" class="textarea"
                        >How are they not well-suited? (optional)</label
                      >
                      <textarea
                        name="isAppropriateForThisKindOfResearchNoDetail"
                        id="is-appropriate-for-this-kind-of-research-question-no-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isAppropriateForThisKindOfResearchNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.isAppropriateForThisKindOfResearchNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="isAppropriateForThisKindOfResearch"
                      type="radio"
                      value="unsure"
                      aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'unsure' },
                          () => 'checked',
                        ),
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
    canonical: Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}
