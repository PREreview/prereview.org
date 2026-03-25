import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, IsDetailedEnoughForm } from './IsDetailedEnoughForm.ts'

export const IsDetailedEnoughQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: IsDetailedEnoughForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('granularEnough')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.isDetailedEnough)
                  ? 'aria-invalid="true" aria-errormessage="is-detailed-enough-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('granularEnough')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.isDetailedEnough)
                ? html`
                    <div class="error-message" id="is-detailed-enough-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.isDetailedEnough.left, {
                        Missing: () => t('selectGranularEnough')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="isDetailedEnough"
                      id="is-detailed-enough-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="is-detailed-enough-tip-yes"
                      aria-controls="is-detailed-enough-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isDetailedEnough: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="is-detailed-enough-tip-yes" role="note">${t('granularEnoughYesTip')()}</p>
                  <div class="conditional" id="is-detailed-enough-yes-control">
                    <div>
                      <label for="is-detailed-enough-yes-detail" class="textarea"
                        >${t('granularEnoughYesWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea name="isDetailedEnoughYesDetail" id="is-detailed-enough-yes-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isDetailedEnoughYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isDetailedEnoughYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isDetailedEnough"
                      type="radio"
                      value="partly"
                      aria-describedby="is-detailed-enough-tip-partly"
                      aria-controls="is-detailed-enough-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isDetailedEnough: 'partly' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('partly')()}</span>
                  </label>
                  <p id="is-detailed-enough-tip-partly" role="note">${t('granularEnoughPartlyTip')()}</p>
                  <div class="conditional" id="is-detailed-enough-partly-control">
                    <div>
                      <label for="is-detailed-enough-partly-detail" class="textarea"
                        >${t('granularEnoughPartlyWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea name="isDetailedEnoughPartlyDetail" id="is-detailed-enough-partly-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isDetailedEnoughPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.isDetailedEnoughPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isDetailedEnough"
                      type="radio"
                      value="no"
                      aria-describedby="is-detailed-enough-tip-no"
                      aria-controls="is-detailed-enough-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isDetailedEnough: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="is-detailed-enough-tip-no" role="note">${t('granularEnoughNoTip')()}</p>
                  <div class="conditional" id="is-detailed-enough-no-control">
                    <div>
                      <label for="is-detailed-enough-no-detail" class="textarea"
                        >${t('granularEnoughNoWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea name="isDetailedEnoughNoDetail" id="is-detailed-enough-no-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isDetailedEnoughNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isDetailedEnoughNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="isDetailedEnough"
                      type="radio"
                      value="unsure"
                      aria-describedby="is-detailed-enough-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isDetailedEnough: 'unsure' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('dontKnow')()}</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.isDetailedEnough)
    ? html`
        <li>
          <a href="#is-detailed-enough-yes">
            ${pipe(
              Match.value(form.isDetailedEnough.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectGranularEnough')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
