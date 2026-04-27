import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { HasTrackedChangesForm, InvalidForm } from './HasTrackedChangesForm.ts'

export const HasTrackedChangesQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: HasTrackedChangesForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('trackChanges')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId })}" class="back">
        <span>${t('forms', 'backLink')()}</span>
      </a>
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.hasTrackedChanges)
                  ? 'aria-invalid="true" aria-errormessage="has-tracked-changes-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('trackChanges')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.hasTrackedChanges)
                ? html`
                    <div class="error-message" id="has-tracked-changes-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}</span>
                      ${Match.valueTags(form.hasTrackedChanges.left, {
                        Missing: () => t('selectTrackChanges')(),
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
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="has-tracked-changes-tip-yes" role="note">${t('trackChangesYesTip')()}</p>
                  <div class="conditional" id="has-tracked-changes-yes-control">
                    <div>
                      <label for="has-tracked-changes-yes-detail" class="textarea"
                        >${t('trackChangesYesWhy')()} ${t('forms', 'optionalSuffix')()}</label
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
                    <span>${t('partly')()}</span>
                  </label>
                  <p id="has-tracked-changes-tip-partly" role="note">${t('trackChangesPartlyTip')()}</p>
                  <div class="conditional" id="has-tracked-changes-partly-control">
                    <div>
                      <label for="has-tracked-changes-partly-detail" class="textarea"
                        >${t('trackChangesPartlyWhy')()} ${t('forms', 'optionalSuffix')()}</label
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
                    <span>${t('no')()}</span>
                  </label>
                  <div class="conditional" id="has-tracked-changes-no-control">
                    <div>
                      <label for="has-tracked-changes-no-detail" class="textarea"
                        >${t('trackChangesNoWhy')()} ${t('forms', 'optionalSuffix')()}</label
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
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
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
                    <span>${t('doNotKnow')()}</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.hasTrackedChanges)
    ? html`
        <li>
          <a href="#has-tracked-changes-yes">
            ${pipe(
              Match.value(form.hasTrackedChanges.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectTrackChanges')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
