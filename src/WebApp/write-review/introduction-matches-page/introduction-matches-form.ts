import { Match, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import { writeReviewIntroductionMatchesMatch, writeReviewReviewTypeMatch } from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { prereviewOfSuffix } from '../shared-elements.ts'

export interface IntroductionMatchesForm {
  readonly introductionMatches: E.Either<MissingE, 'yes' | 'partly' | 'no' | 'skip' | undefined>
  readonly introductionMatchesYesDetails: E.Either<never, NonEmptyString | undefined>
  readonly introductionMatchesPartlyDetails: E.Either<never, NonEmptyString | undefined>
  readonly introductionMatchesNoDetails: E.Either<never, NonEmptyString | undefined>
}

export function introductionMatchesForm(
  preprint: PreprintTitle,
  form: IntroductionMatchesForm,
  locale: SupportedLocale,
) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('doesIntroductionExplain')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.introductionMatches)
                    ? html`
                        <li>
                          <a href="#introduction-matches-yes">
                            ${Match.valueTags(form.introductionMatches.left, {
                              MissingE: () => t('selectIntroductionExplains')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.introductionMatches) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.introductionMatches)
                  ? 'aria-invalid="true" aria-errormessage="introduction-matches-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('doesIntroductionExplain')()}</h1>
              </legend>

              ${E.isLeft(form.introductionMatches)
                ? html`
                    <div class="error-message" id="introduction-matches-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.introductionMatches.left, {
                        MissingE: () => t('selectIntroductionExplains')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="introductionMatches"
                      id="introduction-matches-yes"
                      type="radio"
                      value="yes"
                      aria-describedby="introduction-matches-tip-yes"
                      aria-controls="introduction-matches-yes-control"
                      ${match(form.introductionMatches)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="introduction-matches-tip-yes" role="note">${t('clearlyExplainsTip')()}</p>
                  <div class="conditional" id="introduction-matches-yes-control">
                    <div>
                      <label for="introduction-matches-yes-details" class="textarea"
                        >${t('howIntroductionExplains')()}</label
                      >

                      <textarea name="introductionMatchesYesDetails" id="introduction-matches-yes-details" rows="5">
${match(form.introductionMatchesYesDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="introductionMatches"
                      type="radio"
                      value="partly"
                      aria-describedby="introduction-matches-tip-partly"
                      aria-controls="introduction-matches-partly-control"
                      ${match(form.introductionMatches)
                        .with({ right: 'partly' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('partly')()}</span>
                  </label>
                  <p id="introduction-matches-tip-partly" role="note">${t('partlyTip')()}</p>
                  <div class="conditional" id="introduction-matches-partly-control">
                    <div>
                      <label for="introduction-matches-partly-details" class="textarea">${t('partlyHow')()}</label>

                      <textarea
                        name="introductionMatchesPartlyDetails"
                        id="introduction-matches-partly-details"
                        rows="5"
                      >
${match(form.introductionMatchesPartlyDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="introductionMatches"
                      type="radio"
                      value="no"
                      aria-describedby="introduction-matches-tip-no"
                      aria-controls="introduction-matches-no-control"
                      ${match(form.introductionMatches)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="introduction-matches-tip-no" role="note">${t('doesNotExplain')()}</p>
                  <div class="conditional" id="introduction-matches-no-control">
                    <div>
                      <label for="introduction-matches-no-details" class="textarea">${t('doesNotExplainHow')()}</label>

                      <textarea name="introductionMatchesNoDetails" id="introduction-matches-no-details" rows="5">
${match(form.introductionMatchesNoDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${translate(locale, 'forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="introductionMatches"
                      type="radio"
                      value="skip"
                      ${match(form.introductionMatches)
                        .with({ right: 'skip' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('iDoNotKnow')()}</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipToLabel: 'form',
  })
}
