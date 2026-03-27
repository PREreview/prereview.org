import { Either, Match, Option, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as DeclareCompetingInterestsForm from './DeclareCompetingInterestsForm.ts'

export const DeclareCompetingInterestsPage = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid.Uuid
  form: DeclareCompetingInterestsForm.DeclareCompetingInterestsForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('haveCompetingInterests')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetDeclareCompetingInterests.href({ datasetReviewId })}"
        novalidate
      >
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <conditional-inputs>
            <fieldset
              role="group"
              aria-describedby="declare-competing-interests-tip"
              ${rawHtml(
                hasAnError && Either.isLeft(form.declareCompetingInterests)
                  ? 'aria-invalid="true" aria-errormessage="declare-competing-interests-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('haveCompetingInterests')()}</h1>
              </legend>

              <div id="declare-competing-interests-tip" role="note">
                <p>${t('competingInterestsTip')()}</p>

                <p>${t('competingInterestDefinition')()}</p>
              </div>

              <details>
                <summary><span>${t('examples')()}</span></summary>

                <div>
                  <ul>
                    <li>${t('examplePersonalRelationship')()}</li>
                    <li>${t('exampleRival')()}</li>
                    <li>${t('exampleWorked')()}</li>
                    <li>${t('exampleCollaborate')()}</li>
                    <li>${t('examplePublished')()}</li>
                    <li>${t('exampleGrant')()}</li>
                  </ul>
                </div>
              </details>

              ${hasAnError && Either.isLeft(form.declareCompetingInterests)
                ? html`
                    <div class="error-message" id="declare-competing-interests-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${pipe(
                        Match.value(form.declareCompetingInterests.left),
                        Match.tag('Missing', () => t('selectCompetingInterests')()),
                        Match.exhaustive,
                      )}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="declareCompetingInterests"
                      id="declare-competing-interests-no"
                      type="radio"
                      value="no"
                      ${pipe(
                        Match.value(form),
                        Match.when(
                          {
                            _tag: 'CompletedForm',
                            declareCompetingInterests: competingInterests => competingInterests === 'no',
                          },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('no')()}</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="declareCompetingInterests"
                      type="radio"
                      value="yes"
                      aria-controls="competing-interests-details-control"
                      ${pipe(
                        Match.value(form),
                        Match.whenOr(
                          {
                            _tag: 'CompletedForm',
                            declareCompetingInterests: 'yes',
                          },
                          {
                            _tag: 'InvalidForm',
                            declareCompetingInterests: Either.right('yes' as const),
                          },
                          () => 'checked',
                        ),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <div class="conditional" id="competing-interests-details-control">
                    <div ${rawHtml(hasAnError && Either.isLeft(form.competingInterestsDetails) ? 'class="error"' : '')}>
                      <label for="competing-interests-details" class="textarea"
                        >${t('competingInterestsDetails')()}</label
                      >

                      ${hasAnError && Either.isLeft(form.competingInterestsDetails)
                        ? html`
                            <div class="error-message" id="competing-interests-details-error">
                              <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                              ${pipe(
                                Match.value(form.competingInterestsDetails.left),
                                Match.tag('Missing', () => t('enterCompetingInterestsDetails')()),
                                Match.exhaustive,
                              )}
                            </div>
                          `
                        : ''}

                      <textarea
                        name="competingInterestsDetails"
                        id="competing-interests-details"
                        rows="5"
                        ${rawHtml(
                          hasAnError && Either.isLeft(form.competingInterestsDetails)
                            ? 'aria-invalid="true" aria-errormessage="competing-interests-details-error"'
                            : '',
                        )}
                      >
${pipe(
                          Match.value(form),
                          Match.when(
                            { _tag: 'CompletedForm', competingInterestsDetails: Option.isSome },
                            ({ competingInterestsDetails }) => competingInterestsDetails.value,
                          ),
                          Match.orElse(() => ''),
                        )}</textarea
                      >
                    </div>
                  </div>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetDeclareCompetingInterests.href({ datasetReviewId }),
    js: hasAnError ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: DeclareCompetingInterestsForm.InvalidForm) => html`
  ${Either.isLeft(form.declareCompetingInterests)
    ? html`
        <li>
          <a href="#declare-competing-interests-no">
            ${pipe(
              Match.value(form.declareCompetingInterests.left),
              Match.tag('Missing', () => translate(locale, 'review-a-dataset-flow', 'selectCompetingInterests')()),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : ''}
  ${Either.isLeft(form.competingInterestsDetails)
    ? html`
        <li>
          <a href="#competing-interests-details">
            ${pipe(
              Match.value(form.competingInterestsDetails.left),
              Match.tag('Missing', () =>
                translate(locale, 'review-a-dataset-flow', 'enterCompetingInterestsDetails')(),
              ),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : ''}
`
