import { Match, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import { writeReviewReadyFullReviewMatch, writeReviewShouldReadMatch } from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { prereviewOfSuffix } from '../shared-elements.ts'

export interface ReadyFullReviewForm {
  readonly readyFullReview: E.Either<MissingE, 'no' | 'yes-changes' | 'yes' | undefined>
  readonly readyFullReviewNoDetails: E.Either<never, NonEmptyString | undefined>
  readonly readyFullReviewYesChangesDetails: E.Either<never, NonEmptyString | undefined>
  readonly readyFullReviewYesDetails: E.Either<never, NonEmptyString | undefined>
}

export function readyFullReviewForm(preprint: PreprintTitle, form: ReadyFullReviewForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('readyForAttention')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewReadyFullReviewMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.readyFullReview)
                    ? html`
                        <li>
                          <a href="#ready-full-review-yes">
                            ${Match.valueTags(form.readyFullReview.left, {
                              MissingE: () => t('selectReadyForAttention')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.readyFullReview) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.readyFullReview) ? 'aria-invalid="true" aria-errormessage="ready-full-review-error"' : '',
              )}
            >
              <legend>
                <h1>${t('readyForAttention')()}</h1>
              </legend>

              ${E.isLeft(form.readyFullReview)
                ? html`
                    <div class="error-message" id="ready-full-review-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.readyFullReview.left, {
                        MissingE: () => t('selectReadyForAttention')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="readyFullReview"
                      id="ready-full-review-yes"
                      type="radio"
                      value="yes"
                      aria-controls="ready-full-review-yes-control"
                      ${match(form.readyFullReview)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('readyForAttentionYes')()}</span>
                  </label>
                  <div class="conditional" id="ready-full-review-yes-control">
                    <div>
                      <label for="ready-full-review-yes-details" class="textarea"
                        >${t('readyForAttentionYesWhy')()}</label
                      >

                      <textarea name="readyFullReviewYesDetails" id="ready-full-review-yes-details" rows="5">
${match(form.readyFullReviewYesDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="readyFullReview"
                      type="radio"
                      value="yes-changes"
                      aria-controls="ready-full-review-yes-changes-control"
                      ${match(form.readyFullReview)
                        .with({ right: 'yes-changes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('readyForAttentionMinorChanges')()}</span>
                  </label>
                  <div class="conditional" id="ready-full-review-yes-changes-control">
                    <div>
                      <label for="ready-full-review-yes-changes-details" class="textarea"
                        >${t('readyForAttentionMinorChangesWhy')()}</label
                      >

                      <textarea
                        name="readyFullReviewYesChangesDetails"
                        id="ready-full-review-yes-changes-details"
                        rows="5"
                      >
${match(form.readyFullReviewYesChangesDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="readyFullReview"
                      type="radio"
                      value="no"
                      aria-controls="ready-full-review-no-control"
                      ${match(form.readyFullReview)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('readyForAttentionNo')()}</span>
                  </label>
                  <div class="conditional" id="ready-full-review-no-control">
                    <div>
                      <label for="ready-full-review-no-details" class="textarea"
                        >${t('readyForAttentionNoWhy')()}</label
                      >

                      <textarea name="readyFullReviewNoDetails" id="ready-full-review-no-details" rows="5">
${match(form.readyFullReviewNoDetails)
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipToLabel: 'form',
  })
}
