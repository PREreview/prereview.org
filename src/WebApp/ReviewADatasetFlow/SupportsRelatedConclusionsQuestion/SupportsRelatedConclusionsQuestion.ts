import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, SupportsRelatedConclusionsForm } from './SupportsRelatedConclusionsForm.ts'

export const SupportsRelatedConclusionsQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: SupportsRelatedConclusionsForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('supportsConclusion')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetIsAppropriateForThisKindOfResearch.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId })}"
        novalidate
      >
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.supportsRelatedConclusions)
                  ? 'aria-invalid="true" aria-errormessage="supports-related-conclusions-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('supportsConclusion')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.supportsRelatedConclusions)
                ? html`
                    <div class="error-message" id="supports-related-conclusions-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}</span>
                      ${Match.valueTags(form.supportsRelatedConclusions.left, {
                        Missing: () => t('selectSupportsConclusion')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="supportsRelatedConclusions"
                      id="supports-related-conclusions-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="supports-related-conclusions-tip-yes"
                      aria-controls="supports-related-conclusions-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="supports-related-conclusions-tip-yes" role="note">${t('supportsConclusionYesTip')()}</p>
                  <div class="conditional" id="supports-related-conclusions-yes-control">
                    <div>
                      <label for="supports-related-conclusions-yes-detail" class="textarea"
                        >${t('supportsConclusionYesWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="supportsRelatedConclusionsYesDetail"
                        id="supports-related-conclusions-yes-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.supportsRelatedConclusionsYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.supportsRelatedConclusionsYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="supportsRelatedConclusions"
                      type="radio"
                      value="partly"
                      aria-describedby="supports-related-conclusions-tip-partly"
                      aria-controls="supports-related-conclusions-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'partly' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('partly')()}</span>
                  </label>
                  <p id="supports-related-conclusions-tip-partly" role="note">${t('supportsConclusionPartlyTip')()}</p>
                  <div class="conditional" id="supports-related-conclusions-partly-control">
                    <div>
                      <label for="supports-related-conclusions-partly-detail" class="textarea"
                        >${t('supportsConclusionPartlyWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="supportsRelatedConclusionsPartlyDetail"
                        id="supports-related-conclusions-partly-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.supportsRelatedConclusionsPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.supportsRelatedConclusionsPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="supportsRelatedConclusions"
                      type="radio"
                      value="no"
                      aria-describedby="supports-related-conclusions-tip-no"
                      aria-controls="supports-related-conclusions-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="supports-related-conclusions-tip-no" role="note">${t('supportsConclusionNoTip')()}</p>
                  <div class="conditional" id="supports-related-conclusions-no-control">
                    <div>
                      <label for="supports-related-conclusions-no-detail" class="textarea"
                        >${t('supportsConclusionNoWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="supportsRelatedConclusionsNoDetail"
                        id="supports-related-conclusions-no-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.supportsRelatedConclusionsNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.supportsRelatedConclusionsNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="supportsRelatedConclusions"
                      type="radio"
                      value="unsure"
                      aria-describedby="supports-related-conclusions-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', supportsRelatedConclusions: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.supportsRelatedConclusions)
    ? html`
        <li>
          <a href="#supports-related-conclusions-yes">
            ${pipe(
              Match.value(form.supportsRelatedConclusions.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectSupportsConclusion')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
