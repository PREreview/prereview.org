import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, IsReadyToBeSharedForm } from './IsReadyToBeSharedForm.ts'

export const IsReadyToBeSharedQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: IsReadyToBeSharedForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('readyToBeShared')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetMattersToItsAudience.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.isReadyToBeShared)
                  ? 'aria-invalid="true" aria-errormessage="is-ready-to-be-shared-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('readyToBeShared')()}</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.isReadyToBeShared)
                ? html`
                    <div class="error-message" id="is-ready-to-be-shared-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.isReadyToBeShared.left, {
                        Missing: () => t('selectReadyToBeShared')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="isReadyToBeShared"
                      id="is-ready-to-be-shared-yes"
                      type="radio"
                      value="yes"
                      aria-controls="is-ready-to-be-shared-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isReadyToBeShared: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <div class="conditional" id="is-ready-to-be-shared-yes-control">
                    <div>
                      <label for="is-ready-to-be-shared-yes-detail" class="textarea"
                        >${t('readyToBeSharedYesWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea name="isReadyToBeSharedYesDetail" id="is-ready-to-be-shared-yes-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isReadyToBeSharedYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isReadyToBeSharedYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isReadyToBeShared"
                      type="radio"
                      value="no"
                      aria-controls="is-ready-to-be-shared-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isReadyToBeShared: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <div class="conditional" id="is-ready-to-be-shared-no-control">
                    <div>
                      <label for="is-ready-to-be-shared-no-detail" class="textarea"
                        >${t('readyToBeSharedNoWhy')()} ${t('forms', 'optionalSuffix')()}</label
                      >
                      <textarea name="isReadyToBeSharedNoDetail" id="is-ready-to-be-shared-no-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isReadyToBeSharedNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isReadyToBeSharedNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${t('forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="isReadyToBeShared"
                      type="radio"
                      value="unsure"
                      aria-describedby="is-ready-to-be-shared-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isReadyToBeShared: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.isReadyToBeShared)
    ? html`
        <li>
          <a href="#is-ready-to-be-shared-yes">
            ${pipe(
              Match.value(form.isReadyToBeShared.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectReadyToBeShared')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
