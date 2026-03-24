import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, RateTheQualityForm } from './RateTheQualityForm.ts'

export const RateTheQualityQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: RateTheQualityForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('rateQuality')(), errorPrefix(locale, hasAnError), plainText),
    main: html`
      <form method="post" action="${Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.qualityRating)
                  ? 'aria-invalid="true" aria-errormessage="rate-the-quality-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('rateQuality')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.qualityRating)
                ? html`
                    <div class="error-message" id="rate-the-quality-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.qualityRating.left, {
                        Missing: () => t('selectRateQuality')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="qualityRating"
                      id="rate-the-quality-excellent"
                      type="radio"
                      value="excellent"
                      aria-describedby="rate-the-quality-tip-excellent"
                      aria-controls="rate-the-quality-excellent-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', qualityRating: 'excellent' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('excellent')()}</span>
                  </label>
                  <p id="rate-the-quality-tip-excellent" role="note">${t('excellentTip')()}</p>
                  <div class="conditional" id="rate-the-quality-excellent-control">
                    <div>
                      <label for="rate-the-quality-excellent-detail" class="textarea"
                        >${t('excellentWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea name="qualityRatingExcellentDetail" id="rate-the-quality-excellent-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.qualityRatingExcellentDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.qualityRatingExcellentDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="qualityRating"
                      type="radio"
                      value="fair"
                      aria-describedby="rate-the-quality-tip-fair"
                      aria-controls="rate-the-quality-fair-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', qualityRating: 'fair' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('fair')()}</span>
                  </label>
                  <p id="rate-the-quality-tip-fair" role="note">${t('fairTip')()}</p>
                  <div class="conditional" id="rate-the-quality-fair-control">
                    <div>
                      <label for="rate-the-quality-fair-detail" class="textarea"
                        >${t('fairWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea name="qualityRatingFairDetail" id="rate-the-quality-fair-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.qualityRatingFairDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.qualityRatingFairDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="qualityRating"
                      type="radio"
                      f
                      value="poor"
                      aria-describedby="rate-the-quality-tip-poor"
                      aria-controls="rate-the-quality-poor-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', qualityRating: 'poor' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('poor')()}</span>
                  </label>
                  <p id="rate-the-quality-tip-poor" role="note">${t('poorTip')()}</p>
                  <div class="conditional" id="rate-the-quality-poor-control">
                    <div>
                      <label for="rate-the-quality-poor-detail" class="textarea"
                        >${t('poorWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea name="qualityRatingPoorDetail" id="rate-the-quality-poor-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.qualityRatingPoorDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.qualityRatingPoorDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="qualityRating"
                      type="radio"
                      value="unsure"
                      aria-describedby="rate-the-quality-tip-unsure"
                      aria-controls="rate-the-quality-unsure-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', qualityRating: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  html` ${Either.isLeft(form.qualityRating)
    ? html`
        <li>
          <a href="#rate-the-quality-excellent">
            ${pipe(
              Match.value(form.qualityRating.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectRateQuality')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : ''}`
