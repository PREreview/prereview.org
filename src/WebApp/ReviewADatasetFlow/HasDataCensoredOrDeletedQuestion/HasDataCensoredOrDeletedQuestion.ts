import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { HasDataCensoredOrDeletedForm, InvalidForm } from './HasDataCensoredOrDeletedForm.ts'

export const HasDataCensoredOrDeletedQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: HasDataCensoredOrDeletedForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('signsOfAlteration')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetHasTrackedChanges.href({ datasetReviewId })}" class="back">
        <span>${t('forms', 'backLink')()}</span>
      </a>
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId })}"
        novalidate
      >
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.hasDataCensoredOrDeleted)
                  ? 'aria-invalid="true" aria-errormessage="has-data-censored-or-deleted-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('signsOfAlteration')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.hasDataCensoredOrDeleted)
                ? html`
                    <div class="error-message" id="has-data-censored-or-deleted-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.hasDataCensoredOrDeleted.left, {
                        Missing: () => t('selectSignsOfAlteration')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="hasDataCensoredOrDeleted"
                      id="has-data-censored-or-deleted-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="has-data-censored-or-deleted-tip-yes"
                      aria-controls="has-data-censored-or-deleted-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasDataCensoredOrDeleted: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="has-data-censored-or-deleted-tip-yes" role="note">${t('signsOfAlterationYesTip')()}</p>
                  <div class="conditional" id="has-data-censored-or-deleted-yes-control">
                    <div>
                      <label for="has-data-censored-or-deleted-yes-detail" class="textarea"
                        >${t('signsOfAlterationYesWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="hasDataCensoredOrDeletedYesDetail"
                        id="has-data-censored-or-deleted-yes-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasDataCensoredOrDeletedYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.hasDataCensoredOrDeletedYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="hasDataCensoredOrDeleted"
                      type="radio"
                      value="partly"
                      aria-describedby="has-data-censored-or-deleted-tip-partly"
                      aria-controls="has-data-censored-or-deleted-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasDataCensoredOrDeleted: 'partly' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('partly')()}</span>
                  </label>
                  <p id="has-data-censored-or-deleted-tip-partly" role="note">${t('signsOfAlterationPartlyTip')()}</p>
                  <div class="conditional" id="has-data-censored-or-deleted-partly-control">
                    <div>
                      <label for="has-data-censored-or-deleted-partly-detail" class="textarea"
                        >${t('signsOfAlterationPartlyWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="hasDataCensoredOrDeletedPartlyDetail"
                        id="has-data-censored-or-deleted-partly-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasDataCensoredOrDeletedPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.hasDataCensoredOrDeletedPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="hasDataCensoredOrDeleted"
                      type="radio"
                      value="no"
                      aria-describedby="has-data-censored-or-deleted-tip-no"
                      aria-controls="has-data-censored-or-deleted-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasDataCensoredOrDeleted: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="has-data-censored-or-deleted-tip-no" role="note">${t('signsOfAlterationNoTip')()}</p>
                  <div class="conditional" id="has-data-censored-or-deleted-no-control">
                    <div>
                      <label for="has-data-censored-or-deleted-no-detail" class="textarea"
                        >${t('signsOfAlterationNoWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="hasDataCensoredOrDeletedNoDetail"
                        id="has-data-censored-or-deleted-no-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasDataCensoredOrDeletedNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.hasDataCensoredOrDeletedNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="hasDataCensoredOrDeleted"
                      type="radio"
                      value="unsure"
                      aria-describedby="has-data-censored-or-deleted-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasDataCensoredOrDeleted: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.hasDataCensoredOrDeleted)
    ? html`
        <li>
          <a href="#has-data-censored-or-deleted-yes">
            ${pipe(
              Match.value(form.hasDataCensoredOrDeleted.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectSignsOfAlteration')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
