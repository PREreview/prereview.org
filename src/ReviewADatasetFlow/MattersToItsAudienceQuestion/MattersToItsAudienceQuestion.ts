import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../response.ts'
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
                researchers, or to the general public? How consequential is it likely to seem to that audience or those
                audiences?
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
              </li>
              <li>
                <label>
                  <input
                    name="mattersToItsAudience"
                    type="radio"
                    value="somewhat-consequential"
                    aria-describedby="matters-to-its-audience-tip-somewhat-consequential"
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
              </li>
              <li>
                <label>
                  <input
                    name="mattersToItsAudience"
                    type="radio"
                    value="not-consequential"
                    aria-describedby="matters-to-its-audience-tip-not-consequential"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', mattersToItsAudience: 'not-consequential' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Not consequential</span>
                </label>
                <p id="matters-to-its-audience-tip-not-consequential" role="note">
                  The dataset isn’t likely to be consequential for its intended audience.
                </p>
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
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
