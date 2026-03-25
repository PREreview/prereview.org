import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, IsErrorFreeForm } from './IsErrorFreeForm.ts'

export const IsErrorFreeQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: IsErrorFreeForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe('Is the dataset relatively error-free?', errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetIsDetailedEnough.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              aria-describedby="is-error-free-tip"
              ${rawHtml(
                hasAnError && Either.isLeft(form.isErrorFree)
                  ? 'aria-invalid="true" aria-errormessage="is-error-free-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Is the dataset relatively error-free?</h1>
              </legend>

              <p id="is-error-free-tip" role="note">
                Errors might include things like using inappropriate data collection or analysis methods, using
                inappropriate metrics with the data, or manipulating the data in other ways that result in errors in the
                dataset.
              </p>

              ${hasAnError && Either.isLeft(form.isErrorFree)
                ? html`
                    <div class="error-message" id="is-error-free-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.isErrorFree.left, {
                        Missing: () => 'Select if the dataset is relatively error-free',
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="isErrorFree"
                      id="is-error-free-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="is-error-free-tip-yes"
                      aria-controls="is-error-free-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isErrorFree: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Yes</span>
                  </label>
                  <p id="is-error-free-tip-yes" role="note">
                    Few, if any errors, are in the dataset, and any errors are minor.
                  </p>
                  <div class="conditional" id="is-error-free-yes-control">
                    <div>
                      <label for="is-error-free-yes-detail" class="textarea">Are there any errors? (optional)</label>
                      <textarea name="isErrorFreeYesDetail" id="is-error-free-yes-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isErrorFreeYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isErrorFreeYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isErrorFree"
                      type="radio"
                      value="partly"
                      aria-describedby="is-error-free-tip-partly"
                      aria-controls="is-error-free-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isErrorFree: 'partly' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Partly</span>
                  </label>
                  <p id="is-error-free-tip-partly" role="note">
                    Several minor errors or even one major error are in the dataset.
                  </p>
                  <div class="conditional" id="is-error-free-partly-control">
                    <div>
                      <label for="is-error-free-partly-detail" class="textarea"
                        >What errors are there? (optional)</label
                      >
                      <textarea name="isErrorFreePartlyDetail" id="is-error-free-partly-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isErrorFreePartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isErrorFreePartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="isErrorFree"
                      type="radio"
                      value="no"
                      aria-describedby="is-error-free-tip-no"
                      aria-controls="is-error-free-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isErrorFree: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>No</span>
                  </label>
                  <p id="is-error-free-tip-no" role="note">Many minor and major errors are in the dataset.</p>
                  <div class="conditional" id="is-error-free-no-control">
                    <div>
                      <label for="is-error-free-no-detail" class="textarea"
                        >What major errors are there? (optional)</label
                      >
                      <textarea name="isErrorFreeNoDetail" id="is-error-free-no-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.isErrorFreeNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.isErrorFreeNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="isErrorFree"
                      type="radio"
                      value="unsure"
                      aria-describedby="is-error-free-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', isErrorFree: 'unsure' }, () => 'checked'),
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

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetIsErrorFree.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.isErrorFree)
    ? html`
        <li>
          <a href="#is-error-free-yes">
            ${pipe(
              Match.value(form.isErrorFree.left),
              Match.tag('Missing', () => 'Select if the dataset is relatively error-free'),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
