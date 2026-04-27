import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { FollowsFairAndCarePrinciplesForm, InvalidForm } from './FollowsFairAndCarePrinciplesForm.ts'

export const FollowsFairAndCarePrinciplesQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: FollowsFairAndCarePrinciplesForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('followFairAndCare')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetRateTheQuality.href({ datasetReviewId })}" class="back">
        <span>${t('forms', 'backLink')()}</span>
      </a>
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId })}"
        novalidate
      >
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.followsFairAndCarePrinciples)
                  ? 'aria-invalid="true" aria-errormessage="findings-next-steps-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('followFairAndCare')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.followsFairAndCarePrinciples)
                ? html`
                    <div class="error-message" id="findings-next-steps-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.followsFairAndCarePrinciples.left, {
                        Missing: () => t('selectFollowFairAndCare')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="followsFairAndCarePrinciples"
                      id="follows-fair-and-care-principles-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="follows-fair-and-care-principles-tip-yes"
                      aria-controls="follows-fair-and-care-principles-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', followsFairAndCarePrinciples: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="follows-fair-and-care-principles-tip-yes" role="note">${t('followFairAndCareYesTip')()}</p>
                  <div class="conditional" id="follows-fair-and-care-principles-yes-control">
                    <div>
                      <label for="follows-fair-and-care-principles-yes-detail" class="textarea"
                        >${t('followFairAndCareYesWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="followsFairAndCarePrinciplesYesDetail"
                        id="follows-fair-and-care-principles-yes-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.followsFairAndCarePrinciplesYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.followsFairAndCarePrinciplesYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="followsFairAndCarePrinciples"
                      type="radio"
                      value="partly"
                      aria-describedby="follows-fair-and-care-principles-tip-partly"
                      aria-controls="follows-fair-and-care-principles-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', followsFairAndCarePrinciples: 'partly' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('partly')()}</span>
                  </label>
                  <p id="follows-fair-and-care-principles-tip-partly" role="note">
                    ${t('followFairAndCarePartlyTip')()}
                  </p>
                  <div class="conditional" id="follows-fair-and-care-principles-partly-control">
                    <div>
                      <label for="follows-fair-and-care-principles-partly-detail" class="textarea"
                        >${t('followFairAndCarePartlyWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="followsFairAndCarePrinciplesPartlyDetail"
                        id="follows-fair-and-care-principles-partly-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.followsFairAndCarePrinciplesPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.followsFairAndCarePrinciplesPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="followsFairAndCarePrinciples"
                      type="radio"
                      value="no"
                      aria-describedby="follows-fair-and-care-principles-tip-no"
                      aria-controls="follows-fair-and-care-principles-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', followsFairAndCarePrinciples: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="follows-fair-and-care-principles-tip-no" role="note">${t('followFairAndCareNoTip')()}</p>
                  <div class="conditional" id="follows-fair-and-care-principles-no-control">
                    <div>
                      <label for="follows-fair-and-care-principles-no-detail" class="textarea"
                        >${t('followFairAndCareNoWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="followsFairAndCarePrinciplesNoDetail"
                        id="follows-fair-and-care-principles-no-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.followsFairAndCarePrinciplesNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.followsFairAndCarePrinciplesNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="followsFairAndCarePrinciples"
                      type="radio"
                      value="unsure"
                      aria-describedby="follows-fair-and-care-principles-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', followsFairAndCarePrinciples: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.followsFairAndCarePrinciples)
    ? html`
        <li>
          <a href="#follows-fair-and-care-principles-yes">
            ${pipe(
              Match.value(form.followsFairAndCarePrinciples.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectFollowFairAndCare')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
