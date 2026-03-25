import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, IsAppropriateForThisKindOfResearchForm } from './IsAppropriateForThisKindOfResearchForm.ts'

export const IsAppropriateForThisKindOfResearchQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: IsAppropriateForThisKindOfResearchForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('suitedForPurpose')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetHasDataCensoredOrDeleted.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId })}"
        novalidate
      >
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.isAppropriateForThisKindOfResearch)
                  ? 'aria-invalid="true" aria-errormessage="is-appropriate-for-this-kind-of-research-question-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('suitedForPurpose')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.isAppropriateForThisKindOfResearch)
                ? html`
                    <div class="error-message" id="is-appropriate-for-this-kind-of-research-question-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.isAppropriateForThisKindOfResearch.left, {
                        Missing: () => t('selectSuitedForPurpose')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="isAppropriateForThisKindOfResearch"
                      id="is-appropriate-for-this-kind-of-research-question-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-yes"
                      aria-controls="is-appropriate-for-this-kind-of-research-question-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'yes' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="is-appropriate-for-this-kind-of-research-question-tip-yes" role="note">
                    ${t('suitedForPurposeYesTip')()}
                  </p>
                  <div class="conditional" id="is-appropriate-for-this-kind-of-research-question-yes-control">
                    <div>
                      <label for="is-appropriate-for-this-kind-of-research-question-yes-detail" class="textarea"
                        >${t('suitedForPurposeYesWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="isAppropriateForThisKindOfResearchYesDetail"
                        id="is-appropriate-for-this-kind-of-research-question-yes-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isAppropriateForThisKindOfResearchYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.isAppropriateForThisKindOfResearchYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isAppropriateForThisKindOfResearch"
                      type="radio"
                      value="partly"
                      aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-partly"
                      aria-controls="is-appropriate-for-this-kind-of-research-question-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'partly' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('partly')()}</span>
                  </label>
                  <p id="is-appropriate-for-this-kind-of-research-question-tip-partly" role="note">
                    ${t('suitedForPurposePartlyTip')()}
                  </p>
                  <div class="conditional" id="is-appropriate-for-this-kind-of-research-question-partly-control">
                    <div>
                      <label for="is-appropriate-for-this-kind-of-research-question-partly-detail" class="textarea"
                        >${t('suitedForPurposePartlyWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="isAppropriateForThisKindOfResearchPartlyDetail"
                        id="is-appropriate-for-this-kind-of-research-question-partly-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isAppropriateForThisKindOfResearchPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.isAppropriateForThisKindOfResearchPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isAppropriateForThisKindOfResearch"
                      type="radio"
                      value="no"
                      aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-no"
                      aria-controls="is-appropriate-for-this-kind-of-research-question-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'no' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="is-appropriate-for-this-kind-of-research-question-tip-no" role="note">
                    ${t('suitedForPurposeNoTip')()}
                  </p>
                  <div class="conditional" id="is-appropriate-for-this-kind-of-research-question-no-control">
                    <div>
                      <label for="is-appropriate-for-this-kind-of-research-question-no-detail" class="textarea"
                        >${t('suitedForPurposeNoWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="isAppropriateForThisKindOfResearchNoDetail"
                        id="is-appropriate-for-this-kind-of-research-question-no-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isAppropriateForThisKindOfResearchNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.isAppropriateForThisKindOfResearchNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="isAppropriateForThisKindOfResearch"
                      type="radio"
                      value="unsure"
                      aria-describedby="is-appropriate-for-this-kind-of-research-question-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', isAppropriateForThisKindOfResearch: 'unsure' },
                          () => 'checked',
                        ),
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
    canonical: Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.isAppropriateForThisKindOfResearch)
    ? html`
        <li>
          <a href="#is-appropriate-for-this-kind-of-research-question-yes">
            ${pipe(
              Match.value(form.isAppropriateForThisKindOfResearch.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectSuitedForPurpose')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
