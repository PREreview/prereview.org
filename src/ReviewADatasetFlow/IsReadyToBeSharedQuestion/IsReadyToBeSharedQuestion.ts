import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/uuid.ts'
import type { IsReadyToBeSharedForm } from './IsReadyToBeSharedForm.ts'

export const IsReadyToBeSharedQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: IsReadyToBeSharedForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Is this dataset ready to be shared?`,
    nav: html`
      <a href="${Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId })}" class="back"
        ><span>Back</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.isReadyToBeShared)
                    ? html`
                        <li>
                          <a href="#is-ready-to-be-shared-yes">
                            ${pipe(
                              Match.value(form.isReadyToBeShared.left),
                              Match.tag('Missing', () => 'Select if the dataset is ready to be shared'),
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
                form._tag === 'InvalidForm' && Either.isLeft(form.isReadyToBeShared)
                  ? 'aria-invalid="true" aria-errormessage="is-ready-to-be-shared-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Is this dataset ready to be shared?</h1>
              </legend>

              ${form._tag === 'InvalidForm' && Either.isLeft(form.isReadyToBeShared)
                ? html`
                    <div class="error-message" id="is-ready-to-be-shared-error">
                      <span class="visually-hidden">Error:</span>
                      ${Match.valueTags(form.isReadyToBeShared.left, {
                        Missing: () => 'Select if the dataset is ready to be shared',
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="isReadyToBeShared"
                      id="is-ready-to-be-shared-yes"
                      type="radio"
                      value="yes"
                      aria-controls="is-ready-to-be-shared-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isReadyToBeShared: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Yes</span>
                  </label>
                  <div class="conditional" id="is-ready-to-be-shared-yes-control">
                    <div>
                      <label for="is-ready-to-be-shared-yes-detail" class="textarea"
                        >Why is it ready to be shared? (optional)</label
                      >
                      <textarea name="isReadyToBeSharedYesDetail" id="is-ready-to-be-shared-yes-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isReadyToBeSharedYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isReadyToBeSharedYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isReadyToBeShared"
                      type="radio"
                      value="no"
                      aria-controls="is-ready-to-be-shared-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isReadyToBeShared: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>No</span>
                  </label>
                  <div class="conditional" id="is-ready-to-be-shared-no-control">
                    <div>
                      <label for="is-ready-to-be-shared-no-detail" class="textarea"
                        >Why is it not ready to be shared? (optional)</label
                      >
                      <textarea name="isReadyToBeSharedNoDetail" id="is-ready-to-be-shared-no-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isReadyToBeSharedNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isReadyToBeSharedNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="isReadyToBeShared"
                      type="radio"
                      value="unsure"
                      aria-describedby="is-ready-to-be-shared-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isReadyToBeShared: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}
