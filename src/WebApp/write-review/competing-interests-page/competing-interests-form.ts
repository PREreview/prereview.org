import { identity, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match, P } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import { writeReviewCompetingInterestsMatch, writeReviewUseOfAiMatch } from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { backNav, prereviewOfSuffix } from '../shared-elements.ts'

export interface CompetingInterestsForm {
  readonly competingInterests: E.Either<MissingE, 'yes' | 'no' | undefined>
  readonly competingInterestsDetails: E.Either<MissingE, NonEmptyString | undefined>
}

export function competingInterestsForm(
  preprint: PreprintTitle,
  form: CompetingInterestsForm,
  locale: SupportedLocale,
  moreAuthors?: 'yes' | 'yes-private' | 'no',
) {
  const error = hasAnError(form)
  const otherAuthors = moreAuthors !== 'no'
  const backMatch = writeReviewUseOfAiMatch
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('write-review', 'competingInterests')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(backMatch.formatter, { id: preprint.id })),
    main: html`
      <form
        method="post"
        action="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error ? pipe(form, toErrorItems(locale, otherAuthors), errorSummary(locale)) : ''}

        <h1>${t('write-review', 'competingInterests')()}</h1>

        <p>${t('write-review', 'discloseCompetingInterests')()}</p>

        <p>${t('write-review', 'whatIsCompetingInterest')()}</p>

        <details>
          <summary><span>${t('write-review', 'examples')()}</span></summary>

          <div>
            <ul>
              <li>${t('write-review', 'conflictPersonalRelationship')()}</li>
              <li>${t('write-review', 'conflictRivalOfAuthor')()}</li>
              <li>${t('write-review', 'conflictRecentlyWorkedTogether')()}</li>
              <li>${t('write-review', 'conflictCollaborateWithAuthor')()}</li>
              <li>${t('write-review', 'conflictPublishedTogether')()}</li>
              <li>${t('write-review', 'conflictHoldGrantTogether')()}</li>
            </ul>
          </div>
        </details>

        <p>${t('write-review', 'competingInterestsMatter')()}</p>

        <div ${rawHtml(E.isLeft(form.competingInterests) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.competingInterests)
                  ? 'aria-invalid="true" aria-errormessage="competing-interests-error"'
                  : '',
              )}
            >
              <legend>
                <h2>
                  ${otherAuthors
                    ? t('write-review', 'doAuthorsHaveCompetingInterests')()
                    : t('write-review', 'doYouHaveCompetingInterests')()}
                </h2>
              </legend>

              ${E.isLeft(form.competingInterests)
                ? html`
                    <div class="error-message" id="competing-interests-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>

                      ${Match.valueTags(form.competingInterests.left, {
                        MissingE: () =>
                          otherAuthors
                            ? translate(locale, 'write-review', 'selectYesIfAuthorsCompetingInterest')()
                            : translate(locale, 'write-review', 'selectYesIfCompetingInterest')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="competingInterests"
                      id="competing-interests-no"
                      type="radio"
                      value="no"
                      ${match(form.competingInterests)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('write-review', 'no')()}</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="competingInterests"
                      type="radio"
                      value="yes"
                      aria-controls="competing-interests-details-control"
                      ${match(form.competingInterests)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('write-review', 'yes')()}</span>
                  </label>
                  <div class="conditional" id="competing-interests-details-control">
                    <div ${rawHtml(E.isLeft(form.competingInterestsDetails) ? 'class="error"' : '')}>
                      <label for="competing-interests-details" class="textarea"
                        >${t('write-review', 'whatAreThey')()}</label
                      >

                      ${E.isLeft(form.competingInterestsDetails)
                        ? html`
                            <div class="error-message" id="competing-interests-details-error">
                              <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                              ${Match.valueTags(form.competingInterestsDetails.left, {
                                MissingE: () =>
                                  otherAuthors
                                    ? translate(locale, 'write-review', 'authorsCompetingInterestDetails')()
                                    : translate(locale, 'write-review', 'competingInterestDetails')(),
                              })}
                            </div>
                          `
                        : ''}

                      <textarea
                        name="competingInterestsDetails"
                        id="competing-interests-details"
                        rows="5"
                        ${rawHtml(
                          E.isLeft(form.competingInterestsDetails)
                            ? 'aria-invalid="true" aria-errormessage="competing-interests-details-error"'
                            : '',
                        )}
                      >
${match(form.competingInterestsDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
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
    canonical: format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: error ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
  })
}

const toErrorItems = (locale: SupportedLocale, otherAuthors: boolean) => (form: CompetingInterestsForm) => html`
  ${E.isLeft(form.competingInterests)
    ? html`
        <li>
          <a href="#competing-interests-no">
            ${Match.valueTags(form.competingInterests.left, {
              MissingE: () =>
                otherAuthors
                  ? translate(locale, 'write-review', 'selectYesIfAuthorsCompetingInterest')()
                  : translate(locale, 'write-review', 'selectYesIfCompetingInterest')(),
            })}
          </a>
        </li>
      `
    : ''}
  ${E.isLeft(form.competingInterestsDetails)
    ? html`
        <li>
          <a href="#competing-interests-details">
            ${Match.valueTags(form.competingInterestsDetails.left, {
              MissingE: () =>
                otherAuthors
                  ? translate(locale, 'write-review', 'authorsCompetingInterestDetails')()
                  : translate(locale, 'write-review', 'competingInterestDetails')(),
            })}
          </a>
        </li>
      `
    : ''}
`
