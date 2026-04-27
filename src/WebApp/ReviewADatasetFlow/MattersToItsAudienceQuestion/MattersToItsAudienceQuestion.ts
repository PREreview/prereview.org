import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, MattersToItsAudienceForm } from './MattersToItsAudienceForm.ts'

export const MattersToItsAudienceQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: MattersToItsAudienceForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('howConsequential')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.mattersToItsAudience)
                  ? 'aria-invalid="true" aria-errormessage="matters-to-its-audience-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('howConsequential')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.mattersToItsAudience)
                ? html`
                    <div class="error-message" id="matters-to-its-audience-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.mattersToItsAudience.left, {
                        Missing: () => t('selectHowConsequential')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="mattersToItsAudience"
                      id="matters-to-its-audience-very-consequential"
                      type="radio"
                      value="very-consequential"
                      aria-describedby="matters-to-its-audience-tip-very-consequential"
                      aria-controls="matters-to-its-audience-very-consequential-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', mattersToItsAudience: 'very-consequential' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('veryConsequential')()}</span>
                  </label>
                  <p id="matters-to-its-audience-tip-very-consequential" role="note">${t('veryConsequentialTip')()}</p>
                  <div class="conditional" id="matters-to-its-audience-very-consequential-control">
                    <div>
                      <label for="matters-to-its-audience-very-consequential-detail" class="textarea"
                        >${t('veryConsequentialWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="mattersToItsAudienceVeryConsequentialDetail"
                        id="matters-to-its-audience-very-consequential-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.mattersToItsAudienceVeryConsequentialDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.mattersToItsAudienceVeryConsequentialDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="mattersToItsAudience"
                      type="radio"
                      value="somewhat-consequential"
                      aria-describedby="matters-to-its-audience-tip-somewhat-consequential"
                      aria-controls="matters-to-its-audience-somewhat-consequential-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', mattersToItsAudience: 'somewhat-consequential' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('somewhatConsequential')()}</span>
                  </label>
                  <p id="matters-to-its-audience-tip-somewhat-consequential" role="note">
                    ${t('somewhatConsequentialTip')()}
                  </p>
                  <div class="conditional" id="matters-to-its-audience-somewhat-consequential-control">
                    <div>
                      <label for="matters-to-its-audience-somewhat-consequential-detail" class="textarea"
                        >${t('somewhatConsequentialWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="mattersToItsAudienceSomewhatConsequentialDetail"
                        id="matters-to-its-audience-somewhat-consequential-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.mattersToItsAudienceSomewhatConsequentialDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.mattersToItsAudienceSomewhatConsequentialDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="mattersToItsAudience"
                      type="radio"
                      value="not-consequential"
                      aria-describedby="matters-to-its-audience-tip-not-consequential"
                      aria-controls="matters-to-its-audience-not-consequential-control"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          { _tag: 'CompletedForm', mattersToItsAudience: 'not-consequential' },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('notConsequential')()}</span>
                  </label>
                  <p id="matters-to-its-audience-tip-not-consequential" role="note">${t('notConsequentialTip')()}</p>
                  <div class="conditional" id="matters-to-its-audience-not-consequential-control">
                    <div>
                      <label for="matters-to-its-audience-not-consequential-detail" class="textarea"
                        >${t('notConsequentialWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea
                        name="mattersToItsAudienceNotConsequentialDetail"
                        id="matters-to-its-audience-not-consequential-detail"
                        rows="5"
                      >
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.mattersToItsAudienceNotConsequentialDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.mattersToItsAudienceNotConsequentialDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="mattersToItsAudience"
                      type="radio"
                      value="unsure"
                      aria-describedby="matters-to-its-audience-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', mattersToItsAudience: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.mattersToItsAudience)
    ? html`
        <li>
          <a href="#matters-to-its-audience-very-consequential">
            ${pipe(
              Match.value(form.mattersToItsAudience.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectHowConsequential')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
