import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/uuid.ts'
import type { IsErrorFreeForm } from './IsErrorFreeForm.ts'

export const IsErrorFreeQuestion = ({ datasetReviewId, form }: { datasetReviewId: Uuid; form: IsErrorFreeForm }) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Is the dataset relatively error-free?`,
    nav: html`
      <a href="${Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId })}" class="back"><span>Back</span></a>
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.isErrorFree)
                    ? html`
                        <li>
                          <a href="#is-error-free-yes">
                            ${pipe(
                              Match.value(form.isErrorFree.left),
                              Match.tag('Missing', () => 'Select if the dataset is relatively error-free'),
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
            aria-describedby="is-error-free-tip"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.isErrorFree)
                ? 'aria-invalid="true" aria-errormessage="is-error-free-error"'
                : '',
            )}
          >
            <legend>
              <h1>Is the dataset relatively error-free?</h1>
            </legend>

            <p id="is-error-free-tip" role="note">
              Errors might include things like using inappropriate data collection or analysis methods, using
              inappropriate metrics with the data, or manipulating the data in other ways that result in errors in the
              dataset.
            </p>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.isErrorFree)
              ? html`
                  <div class="error-message" id="is-error-free-error">
                    <span class="visually-hidden">Error:</span>
                    ${Match.valueTags(form.isErrorFree.left, {
                      Missing: () => 'Select if the dataset is relatively error-free',
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="isErrorFree"
                    id="is-error-free-yes"
                    type="radio"
                    value="yes"
                    aria-describedby="is-error-free-tip-yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isErrorFree: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
                <p id="is-error-free-tip-yes" role="note">
                  Few, if any errors, are in the dataset, and any errors are minor.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="isErrorFree"
                    type="radio"
                    value="partly"
                    aria-describedby="is-error-free-tip-partly"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isErrorFree: 'partly' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Partly</span>
                </label>
                <p id="is-error-free-tip-partly" role="note">
                  Several minor errors or even one major error are in the dataset.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="isErrorFree"
                    type="radio"
                    value="no"
                    aria-describedby="is-error-free-tip-no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isErrorFree: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
                <p id="is-error-free-tip-no" role="note">Many minor and major errors are in the dataset.</p>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input
                    name="isErrorFree"
                    type="radio"
                    value="unsure"
                    aria-describedby="is-error-free-tip-unsure"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isErrorFree: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
