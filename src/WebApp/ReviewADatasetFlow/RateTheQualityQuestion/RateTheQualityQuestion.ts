import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { RateTheQualityForm } from './RateTheQualityForm.ts'

export const RateTheQualityQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: RateTheQualityForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}How would you rate the quality of this data set?`,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.qualityRating)
                    ? html`
                        <li>
                          <a href="#rate-the-quality-excellent">
                            ${pipe(
                              Match.value(form.qualityRating.left),
                              Match.tag('Missing', () => 'Select how you rate the quality'),
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
                form._tag === 'InvalidForm' && Either.isLeft(form.qualityRating)
                  ? 'aria-invalid="true" aria-errormessage="rate-the-quality-error"'
                  : '',
              )}
            >
              <legend>
                <h1>How would you rate the quality of this data set?</h1>
              </legend>

              ${form._tag === 'InvalidForm' && Either.isLeft(form.qualityRating)
                ? html`
                    <div class="error-message" id="rate-the-quality-error">
                      <span class="visually-hidden">Error:</span>
                      ${Match.valueTags(form.qualityRating.left, {
                        Missing: () => 'Select how you rate the quality',
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
                    <span>Excellent</span>
                  </label>
                  <p id="rate-the-quality-tip-excellent" role="note">
                    There are few, if any, noticeable errors, inconsistencies, missing values, or other issues in this
                    dataset.
                  </p>
                  <div class="conditional" id="rate-the-quality-excellent-control">
                    <div>
                      <label for="rate-the-quality-excellent-detail" class="textarea"
                        >Why is it excellent quality? (optional)</label
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
                    <span>Fair</span>
                  </label>
                  <p id="rate-the-quality-tip-fair" role="note">
                    There are some noticeable errors, inconsistencies, missing values, or other issues in this dataset,
                    but it is still intact enough to trust.
                  </p>
                  <div class="conditional" id="rate-the-quality-fair-control">
                    <div>
                      <label for="rate-the-quality-fair-detail" class="textarea"
                        >Why is it fair quality? (optional)</label
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
                    <span>Poor</span>
                  </label>
                  <p id="rate-the-quality-tip-poor" role="note">
                    There are many noticeable errors, inconsistencies, missing values, or other issues in the dataset
                    that make it too difficult to trust.
                  </p>
                  <div class="conditional" id="rate-the-quality-poor-control">
                    <div>
                      <label for="rate-the-quality-poor-detail" class="textarea"
                        >Why is it poor quality? (optional)</label
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
                  <span>or</span>
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
    canonical: Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}
