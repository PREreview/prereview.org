import { Either, Match, Option, pipe, String } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { HasEnoughMetadataForm, InvalidForm } from './HasEnoughMetadataForm.ts'

export const HasEnoughMetadataQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: HasEnoughMetadataForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe('Does the dataset have enough metadata?', errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId })}" class="back">
        <span>${t('forms', 'backLink')()}</span>
      </a>
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                hasAnError && Either.isLeft(form.hasEnoughMetadata)
                  ? 'aria-invalid="true" aria-errormessage="has-enough-metadata-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Does the dataset have enough metadata?</h1>
              </legend>

              ${hasAnError && Either.isLeft(form.hasEnoughMetadata)
                ? html`
                    <div class="error-message" id="has-enough-metadata-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.hasEnoughMetadata.left, {
                        Missing: () => 'Select if the dataset has enough metadata',
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="hasEnoughMetadata"
                      id="has-enough-metadata-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="has-enough-metadata-tip-yes"
                      aria-controls="has-enough-metadata-yes-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasEnoughMetadata: 'yes' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Yes</span>
                  </label>
                  <p id="has-enough-metadata-tip-yes" role="note">
                    The dataset includes enough metadata such as its datatype, tools and methods used to gather and
                    analyze the data, ethical considerations used during data collection and analysis, and support
                    documentation such as a glossary, README, or software recommendations.
                  </p>
                  <div class="conditional" id="has-enough-metadata-yes-control">
                    <div>
                      <label for="has-enough-metadata-yes-detail" class="textarea"
                        >What metadata does it have? (optional)</label
                      >
                      <textarea name="hasEnoughMetadataYesDetail" id="has-enough-metadata-yes-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasEnoughMetadataYesDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.hasEnoughMetadataYesDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="hasEnoughMetadata"
                      type="radio"
                      value="partly"
                      aria-describedby="has-enough-metadata-tip-partly"
                      aria-controls="has-enough-metadata-partly-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasEnoughMetadata: 'partly' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Partly</span>
                  </label>
                  <p id="has-enough-metadata-tip-partly" role="note">
                    The dataset includes some of the information listed above, but more is needed to fully understand
                    how the data were gathered, analyzed, and otherwise used.
                  </p>
                  <div class="conditional" id="has-enough-metadata-partly-control">
                    <div>
                      <label for="has-enough-metadata-partly-detail" class="textarea"
                        >What metadata does it have, and what is missing? (optional)</label
                      >
                      <textarea name="hasEnoughMetadataPartlyDetail" id="has-enough-metadata-partly-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasEnoughMetadataPartlyDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form =>
                            Option.getOrElse(form.hasEnoughMetadataPartlyDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="hasEnoughMetadata"
                      type="radio"
                      value="no"
                      aria-describedby="has-enough-metadata-tip-no"
                      aria-controls="has-enough-metadata-no-control"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasEnoughMetadata: 'no' }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>No</span>
                  </label>
                  <p id="has-enough-metadata-tip-no" role="note">
                    The dataset does not include enough metadata to help understand how the data were gathered,
                    analyzed, and otherwise used.
                  </p>
                  <div class="conditional" id="has-enough-metadata-no-control">
                    <div>
                      <label for="has-enough-metadata-no-detail" class="textarea"
                        >What metadata is missing? (optional)</label
                      >
                      <textarea name="hasEnoughMetadataNoDetail" id="has-enough-metadata-no-detail" rows="5">
${Match.valueTags(form, {
                          EmptyForm: () => '',
                          InvalidForm: form =>
                            Option.getOrElse(
                              Option.flatten(Either.getRight(form.hasEnoughMetadataNoDetail)),
                              () => String.empty,
                            ),
                          CompletedForm: form => Option.getOrElse(form.hasEnoughMetadataNoDetail, () => String.empty),
                        })}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="hasEnoughMetadata"
                      type="radio"
                      value="unsure"
                      aria-describedby="has-enough-metadata-tip-unsure"
                      ${pipe(
                        Match.value(form),
                        Match.when({ _tag: 'CompletedForm', hasEnoughMetadata: 'unsure' }, () => 'checked'),
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
    canonical: Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) =>
  Either.isLeft(form.hasEnoughMetadata)
    ? html`
        <li>
          <a href="#has-enough-metadata-yes">
            ${pipe(
              Match.value(form.hasEnoughMetadata.left),
              Match.tag('Missing', () => 'Select if the dataset has enough metadata'),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : html``
