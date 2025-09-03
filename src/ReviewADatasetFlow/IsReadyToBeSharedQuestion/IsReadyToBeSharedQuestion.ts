import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { Uuid } from '../../types/uuid.js'
import type { IsReadyToBeSharedForm } from './IsReadyToBeSharedForm.js'

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
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isReadyToBeShared: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="isReadyToBeShared"
                    type="radio"
                    value="no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', isReadyToBeShared: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
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
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
