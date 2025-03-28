import { identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { StatusCodes } from 'http-status-codes'
import { match, P } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewUseOfAiMatch,
} from '../../routes.js'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../shared-translation-elements.js'
import type { NonEmptyString } from '../../types/string.js'
import { backNav, prereviewOfSuffix } from '../shared-elements.js'

export interface CompetingInterestsForm {
  readonly competingInterests: E.Either<MissingE, 'yes' | 'no' | undefined>
  readonly competingInterestsDetails: E.Either<MissingE, NonEmptyString | undefined>
}

export function competingInterestsForm(
  preprint: PreprintTitle,
  form: CompetingInterestsForm,
  locale: SupportedLocale,
  mustDeclareUseOfAi: boolean,
  moreAuthors?: 'yes' | 'yes-private' | 'no',
) {
  const error = hasAnError(form)
  const otherAuthors = moreAuthors !== 'no'
  const backMatch = mustDeclareUseOfAi
    ? writeReviewUseOfAiMatch
    : moreAuthors === 'yes'
      ? writeReviewAddAuthorsMatch
      : writeReviewAuthorsMatch
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
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
              <li>${t('write-review', 'conflictAuthorOfPreprint')()}</li>
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
                <h2>${t('write-review', 'doYouHaveCompetingInterests')({ otherAuthors })}</h2>
              </legend>

              ${E.isLeft(form.competingInterests)
                ? html`
                    <div class="error-message" id="competing-interests-error">
                      <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                      ${match(form.competingInterests.left)
                        .with({ _tag: 'MissingE' }, () =>
                          t('write-review', 'selectYesIfCompetingInterest')({ otherAuthors }),
                        )
                        .exhaustive()}
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
                              <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                              ${match(form.competingInterestsDetails.left)
                                .with({ _tag: 'MissingE' }, () =>
                                  t('write-review', 'competingInterestDetails')({ otherAuthors }),
                                )
                                .exhaustive()}
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
            ${match(form.competingInterests.left)
              .with({ _tag: 'MissingE' }, () =>
                translate(locale, 'write-review', 'selectYesIfCompetingInterest')({ otherAuthors }),
              )
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
  ${E.isLeft(form.competingInterestsDetails)
    ? html`
        <li>
          <a href="#competing-interests-details">
            ${match(form.competingInterestsDetails.left)
              .with({ _tag: 'MissingE' }, () =>
                translate(locale, 'write-review', 'competingInterestDetails')({ otherAuthors }),
              )
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
