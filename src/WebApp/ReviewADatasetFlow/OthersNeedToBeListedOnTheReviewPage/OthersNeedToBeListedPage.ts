import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as OthersNeedToBeListedForm from './OthersNeedToBeListedForm.ts'

export const OthersNeedToBeListedPage = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid.Uuid
  form: OthersNeedToBeListedForm.OthersNeedToBeListedForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('didYouReviewWithAnyoneElse')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId })}" class="back"
        >${t('forms', 'backLink')()}</a
      >
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetOthersNeedToBeListedOnTheReview.href({ datasetReviewId })}"
        novalidate
      >
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <fieldset
            role="group"
            aria-describedby="others-need-to-be-listed-tip"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.othersNeedToBeListed)
                ? 'aria-invalid="true" aria-errormessage="others-need-to-be-listed-error"'
                : '',
            )}
          >
            <legend>
              <h1>${t('didYouReviewWithAnyoneElse')()}</h1>
            </legend>

            <p id="others-need-to-be-listed-tip" role="note">${t('didYouReviewWithAnyoneElseTip')()}</p>

            ${
              form._tag === 'InvalidForm' && Either.isLeft(form.othersNeedToBeListed)
                ? html`
                    <div class="error-message" id="others-need-to-be-listed-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${pipe(
                        Match.value(form.othersNeedToBeListed.left),
                        Match.tag('Missing', () => t('selectDidYouReviewWithAnyoneElse')()),
                        Match.exhaustive,
                      )}
                    </div>
                  `
                : ''
            }

            <ol>
              <li>
                <label>
                  <input
                    name="othersNeedToBeListed"
                    id="others-need-to-be-listed-no"
                    type="radio"
                    value="no"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        {
                          _tag: 'CompletedForm',
                          othersNeedToBeListed: othersNeedToBeListed => othersNeedToBeListed === 'no',
                        },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${t('no')()}
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="othersNeedToBeListed"
                    type="radio"
                    value="yes"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        {
                          _tag: 'CompletedForm',
                          othersNeedToBeListed: othersNeedToBeListed => othersNeedToBeListed === 'yes',
                        },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${t('yes')()}
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetOthersNeedToBeListedOnTheReview.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: OthersNeedToBeListedForm.InvalidForm) => html`
  ${
    Either.isLeft(form.othersNeedToBeListed)
      ? html`
          <li>
            <a href="#others-need-to-be-listed-no">
              ${pipe(
                Match.value(form.othersNeedToBeListed.left),
                Match.tag('Missing', () =>
                  translate(locale, 'review-a-dataset-flow', 'selectDidYouReviewWithAnyoneElse')(),
                ),
                Match.exhaustive,
              )}
            </a>
          </li>
        `
      : ''
  }
`
