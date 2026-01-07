import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { HasTrackedChangesForm } from './HasTrackedChangesForm.ts'

export const HasTrackedChangesQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: HasTrackedChangesForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?`,
    nav: html`
      <a href="${Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId })}" class="back">
        <span>Back</span>
      </a>
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.hasTrackedChanges)
                    ? html`
                        <li>
                          <a href="#has-tracked-changes-yes">
                            ${pipe(
                              Match.value(form.hasTrackedChanges.left),
                              Match.tag(
                                'Missing',
                                () => 'Select if the dataset has a way to list or track changes or versions',
                              ),
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
                form._tag === 'InvalidForm' && Either.isLeft(form.hasTrackedChanges)
                  ? 'aria-invalid="true" aria-errormessage="has-tracked-changes-error"'
                  : '',
              )}
            >
              <legend>
                <h1>
                  Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?
                </h1>
              </legend>

              ${form._tag === 'InvalidForm' && Either.isLeft(form.hasTrackedChanges)
                ? html`
                    <div class="error-message" id="has-tracked-changes-error">
                      <span class="visually-hidden">Error:</span>
                      ${Match.valueTags(form.hasTrackedChanges.left, {
                        Missing: () => 'Select if the dataset has a way to list or track changes or versions',
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="hasTrackedChanges"
                      id="has-tracked-changes-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="has-tracked-changes-tip-yes"
                      aria-controls="has-tracked-changes-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasTrackedChanges: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Yes</span>
                  </label>
                  <p id="has-tracked-changes-tip-yes" role="note">
                    The dataset has a clear version history that appears to be accurate and up-to-date.
                  </p>
                  <div class="conditional" id="has-tracked-changes-yes-control">
                    <div>
                      <label for="has-tracked-changes-yes-detail" class="textarea"
                        >How does the dataset share its metadata? (optional)</label
                      >
                      <textarea name="hasTrackedChangesYesDetail" id="has-tracked-changes-yes-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasTrackedChangesYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.hasTrackedChangesYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="hasTrackedChanges"
                      type="radio"
                      value="partly"
                      aria-describedby="has-tracked-changes-tip-partly"
                      aria-controls="has-tracked-changes-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasTrackedChanges: 'partly' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Partly</span>
                  </label>
                  <p id="has-tracked-changes-tip-partly" role="note">
                    The dataset includes a way to list or track changes or versions, but it doesn’t seem to be accurate
                    or current.
                  </p>
                  <div class="conditional" id="has-tracked-changes-partly-control">
                    <div>
                      <label for="has-tracked-changes-partly-detail" class="textarea"
                        >How does the dataset share its metadata? What’s missing? (optional)</label
                      >
                      <textarea name="hasTrackedChangesPartlyDetail" id="has-tracked-changes-partly-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasTrackedChangesPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.hasTrackedChangesPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="hasTrackedChanges"
                      type="radio"
                      value="no"
                      aria-describedby="has-tracked-changes-tip-no"
                      aria-controls="has-tracked-changes-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasTrackedChanges: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>No</span>
                  </label>
                  <div class="conditional" id="has-tracked-changes-no-control">
                    <div>
                      <label for="has-tracked-changes-no-detail" class="textarea"
                        >How should the dataset present its missing metadata? (optional)</label
                      >
                      <textarea name="hasTrackedChangesNoDetail" id="has-tracked-changes-no-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasTrackedChangesNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.hasTrackedChangesNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="hasTrackedChanges"
                      type="radio"
                      value="unsure"
                      aria-describedby="has-tracked-changes-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasTrackedChanges: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}
