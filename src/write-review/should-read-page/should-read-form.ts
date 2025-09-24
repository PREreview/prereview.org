import { Match, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form.ts'
import { html, plainText, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import type { PreprintTitle } from '../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../response.ts'
import { writeReviewLanguageEditingMatch, writeReviewShouldReadMatch } from '../../routes.ts'
import { errorPrefix } from '../../shared-translation-elements.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { prereviewOfSuffix } from '../shared-elements.ts'

export interface ShouldReadForm {
  readonly shouldRead: E.Either<MissingE, 'no' | 'yes-but' | 'yes' | undefined>
  readonly shouldReadNoDetails: E.Either<never, NonEmptyString | undefined>
  readonly shouldReadYesButDetails: E.Either<never, NonEmptyString | undefined>
  readonly shouldReadYesDetails: E.Either<never, NonEmptyString | undefined>
}

export function shouldReadForm(preprint: PreprintTitle, form: ShouldReadForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('wouldRecommend')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.shouldRead)
                    ? html`
                        <li>
                          <a href="#should-read-yes">
                            ${Match.valueTags(form.shouldRead.left, {
                              MissingE: () => t('selectWouldRecommend')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.shouldRead) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(E.isLeft(form.shouldRead) ? 'aria-invalid="true" aria-errormessage="should-read-error"' : '')}
            >
              <legend>
                <h1>${t('wouldRecommend')()}</h1>
              </legend>

              ${E.isLeft(form.shouldRead)
                ? html`
                    <div class="error-message" id="should-read-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.shouldRead.left, {
                        MissingE: () => t('selectWouldRecommend')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="shouldRead"
                      id="should-read-yes"
                      type="radio"
                      value="yes"
                      aria-controls="should-read-yes-control"
                      ${match(form.shouldRead)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('wouldRecommendYes')()}</span>
                  </label>
                  <div class="conditional" id="should-read-yes-control">
                    <div>
                      <label for="should-read-yes-details" class="textarea">${t('wouldRecommendYesHow')()}</label>

                      <textarea name="shouldReadYesDetails" id="should-read-yes-details" rows="5">
${match(form.shouldReadYesDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="shouldRead"
                      type="radio"
                      value="yes-but"
                      aria-controls="should-read-yes-but-control"
                      ${match(form.shouldRead)
                        .with({ right: 'yes-but' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('wouldRecommendYesImproved')()}</span>
                  </label>
                  <div class="conditional" id="should-read-yes-but-control">
                    <div>
                      <label for="should-read-yes-but-details" class="textarea"
                        >${t('wouldRecommendYesImprovedWhy')()}</label
                      >

                      <textarea name="shouldReadYesButDetails" id="should-read-yes-but-details" rows="5">
${match(form.shouldReadYesButDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="shouldRead"
                      type="radio"
                      value="no"
                      aria-controls="should-read-no-control"
                      ${match(form.shouldRead)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('wouldRecommendNo')()}</span>
                  </label>
                  <div class="conditional" id="should-read-no-control">
                    <div>
                      <label for="should-read-no-details" class="textarea">${t('wouldRecommendNoWhy')()}</label>

                      <textarea name="shouldReadNoDetails" id="should-read-no-details" rows="5">
${match(form.shouldReadNoDetails)
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
