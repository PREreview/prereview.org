import { Either, Match, Option, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as DeclareCompetingInterestsForm from './DeclareCompetingInterestsForm.ts'

export const DeclareCompetingInterestsPage = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid.Uuid
  form: DeclareCompetingInterestsForm.DeclareCompetingInterestsForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Do you have any competing interests?`,
    nav: html`
      <a href="${Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId })}" class="back"><span>Back</span></a>
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetDeclareCompetingInterests.href({ datasetReviewId })}"
        novalidate
      >
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.declareCompetingInterests)
                    ? html`
                        <li>
                          <a href="#declare-competing-interests-no">
                            ${pipe(
                              Match.value(form.declareCompetingInterests.left),
                              Match.tag('Missing', () => 'Select yes if you have any competing interests'),
                              Match.exhaustive,
                            )}
                          </a>
                        </li>
                      `
                    : ''}
                  ${Either.isLeft(form.competingInterestsDetails)
                    ? html`
                        <li>
                          <a href="#competing-interests-details">
                            ${pipe(
                              Match.value(form.competingInterestsDetails.left),
                              Match.tag('Missing', () => 'Enter details of your competing interests'),
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
              aria-describedby="declare-competing-interests-tip"
              ${rawHtml(
                form._tag === 'InvalidForm' && Either.isLeft(form.declareCompetingInterests)
                  ? 'aria-invalid="true" aria-errormessage="declare-competing-interests-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Do you have any competing interests?</h1>
              </legend>

              <div id="declare-competing-interests-tip" role="note">
                <p>
                  We ask all reviewers to disclose any competing interests that could influence their review of the
                  dataset.
                </p>

                <p>A competing interest is anything that could interfere with the objectivity of a PREreview.</p>
              </div>

              <details>
                <summary><span>Examples</span></summary>

                <div>
                  <ul>
                    <li>You have a personal relationship with the author.</li>
                    <li>You are a rival or competitor of the author.</li>
                    <li>You have recently worked with the author.</li>
                    <li>You collaborate with the author.</li>
                    <li>You have published with the author in the last five years.</li>
                    <li>You hold a grant with the author.</li>
                  </ul>
                </div>
              </details>

              ${form._tag === 'InvalidForm' && Either.isLeft(form.declareCompetingInterests)
                ? html`
                    <div class="error-message" id="declare-competing-interests-error">
                      <span class="visually-hidden">Error:</span>
                      ${pipe(
                        Match.value(form.declareCompetingInterests.left),
                        Match.tag('Missing', () => 'Select yes if you have any competing interests'),
                        Match.exhaustive,
                      )}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="declareCompetingInterests"
                      id="declare-competing-interests-no"
                      type="radio"
                      value="no"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          {
                            _tag: 'CompletedForm',
                            declareCompetingInterests: competingInterests => competingInterests === 'no',
                          },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>No</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="declareCompetingInterests"
                      type="radio"
                      value="yes"
                      aria-controls="competing-interests-details-control"
                      ${pipe(
                        Match.value(form),
                        Match.whenOr(
                          {
                            _tag: 'CompletedForm',
                            declareCompetingInterests: 'yes',
                          },
                          {
                            _tag: 'InvalidForm',
                            declareCompetingInterests: Either.right('yes' as const),
                          },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Yes</span>
                  </label>
                  <div class="conditional" id="competing-interests-details-control">
                    <div
                      ${rawHtml(
                        form._tag === 'InvalidForm' && Either.isLeft(form.competingInterestsDetails)
                          ? 'class="error"'
                          : '',
                      )}
                    >
                      <label for="competing-interests-details" class="textarea">What are they?</label>

                      ${form._tag === 'InvalidForm' && Either.isLeft(form.competingInterestsDetails)
                        ? html`
                            <div class="error-message" id="competing-interests-details-error">
                              <span class="visually-hidden">Error:</span>
                              ${pipe(
                                Match.value(form.competingInterestsDetails.left),
                                Match.tag('Missing', () => 'Enter details of your competing interests'),
                                Match.exhaustive,
                              )}
                            </div>
                          `
                        : ''}

                      <textarea
                        name="competingInterestsDetails"
                        id="competing-interests-details"
                        rows="5"
                        ${rawHtml(
                          form._tag === 'InvalidForm' && Either.isLeft(form.competingInterestsDetails)
                            ? 'aria-invalid="true" aria-errormessage="competing-interests-details-error"'
                            : '',
                        )}
                      >
${pipe(
                          Match.value(form),
                          Match.when(
                            { _tag: 'CompletedForm', competingInterestsDetails: Option.isSome },
                            ({ competingInterestsDetails }) => competingInterestsDetails.value,
                          ),
                          Match.orElse(() => ''),
                        )}</textarea
                      >
                    </div>
                  </div>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetDeclareCompetingInterests.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}
