import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { Uuid } from '../../types/uuid.js'
import type { IsAppropriateForThisKindOfResearchForm } from './IsAppropriateForThisKindOfResearchForm.js'

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
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
                <p id="is-appropriate-for-this-kind-of-research-question-tip-yes" role="note">
                  The way these data were collected, analyzed, and used is well-suited to support its stated research
                  purpose.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="isAppropriateForThisKindOfResearch"
                    type="radio"
                    value="partly"
                    aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-partly"
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
                  The way these data were collected, analyzed, and used partly supports its stated research purpose, but
                  other questions, methods, or tools would have been better.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="isAppropriateForThisKindOfResearch"
                    type="radio"
                    value="no"
                    aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
                <p id="is-appropriate-for-this-kind-of-research-question-tip-no" role="note">
                  The way these data were collected, analyzed, and used is not well-suited for its stated research
                  purpose.
                </p>
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
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
