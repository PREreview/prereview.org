import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/uuid.ts'
import type { MattersToItsAudienceForm } from './MattersToItsAudienceForm.ts'

export const MattersToItsAudienceQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: MattersToItsAudienceForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Is this dataset likely to be of interest to researchers in its corresponding field of study, to most researchers, or to the general public? How consequential is it likely to seem to that audience or those audiences?`,
    nav: html`
      <a href="${Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId })}" class="back"><span>Back</span></a>
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.mattersToItsAudience)
                    ? html`
                        <li>
                          <a href="#matters-to-its-audience-very-consequential">
                            ${pipe(
                              Match.value(form.mattersToItsAudience.left),
                              Match.tag('Missing', () => 'Select how consequential is it likely to seem'),
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
                form._tag === 'InvalidForm' && Either.isLeft(form.mattersToItsAudience)
                  ? 'aria-invalid="true" aria-errormessage="matters-to-its-audience-error"'
                  : '',
              )}
            >
              <legend>
                <h1>
                  Is this dataset likely to be of interest to researchers in its corresponding field of study, to most
                  researchers, or to the general public? How consequential is it likely to seem to that audience or
                  those audiences?
                </h1>
              </legend>

              ${form._tag === 'InvalidForm' && Either.isLeft(form.mattersToItsAudience)
                ? html`
                    <div class="error-message" id="matters-to-its-audience-error">
                      <span class="visually-hidden">Error:</span>
                      ${Match.valueTags(form.mattersToItsAudience.left, {
                        Missing: () => 'Select how consequential is it likely to seem',
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="mattersToItsAudience"
                      id="matters-to-its-audience-very-consequential"
                      type="radio"
                      value="very-consequential"
                      aria-describedby="matters-to-its-audience-tip-very-consequential"
                      aria-controls="matters-to-its-audience-very-consequential-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', mattersToItsAudience: 'very-consequential' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Very consequential</span>
                  </label>
                  <p id="matters-to-its-audience-tip-very-consequential" role="note">
                    The dataset is likely to be very consequential for a broad audience.
                  </p>
                  <div class="conditional" id="matters-to-its-audience-very-consequential-control">
                    <div>
                      <label for="matters-to-its-audience-very-consequential-detail" class="textarea"
                        >Why is it very consequential? (optional)</label
                      >
                      <textarea
                        name="mattersToItsAudienceVeryConsequentialDetail"
                        id="matters-to-its-audience-very-consequential-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.mattersToItsAudienceVeryConsequentialDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.mattersToItsAudienceVeryConsequentialDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="mattersToItsAudience"
                      type="radio"
                      value="somewhat-consequential"
                      aria-describedby="matters-to-its-audience-tip-somewhat-consequential"
                      aria-controls="matters-to-its-audience-somewhat-consequential-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', mattersToItsAudience: 'somewhat-consequential' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Somewhat consequential</span>
                  </label>
                  <p id="matters-to-its-audience-tip-somewhat-consequential" role="note">
                    Several minor errors or even one major error are in the dataset.
                  </p>
                  <div class="conditional" id="matters-to-its-audience-somewhat-consequential-control">
                    <div>
                      <label for="matters-to-its-audience-somewhat-consequential-detail" class="textarea"
                        >Why is it somewhat consequential? (optional)</label
                      >
                      <textarea
                        name="mattersToItsAudienceSomewhatConsequentialDetail"
                        id="matters-to-its-audience-somewhat-consequential-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.mattersToItsAudienceSomewhatConsequentialDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.mattersToItsAudienceSomewhatConsequentialDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="mattersToItsAudience"
                      type="radio"
                      value="not-consequential"
                      aria-describedby="matters-to-its-audience-tip-not-consequential"
                      aria-controls="matters-to-its-audience-not-consequential-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', mattersToItsAudience: 'not-consequential' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Not consequential</span>
                  </label>
                  <p id="matters-to-its-audience-tip-not-consequential" role="note">
                    The dataset isn’t likely to be consequential for its intended audience.
                  </p>
                  <div class="conditional" id="matters-to-its-audience-not-consequential-control">
                    <div>
                      <label for="matters-to-its-audience-not-consequential-detail" class="textarea"
                        >Why is it not consequential? (optional)</label
                      >
                      <textarea
                        name="mattersToItsAudienceNotConsequentialDetail"
                        id="matters-to-its-audience-not-consequential-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.mattersToItsAudienceNotConsequentialDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.mattersToItsAudienceNotConsequentialDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="mattersToItsAudience"
                      type="radio"
                      value="unsure"
                      aria-describedby="matters-to-its-audience-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', mattersToItsAudience: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}
