import { Match, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { PreprintTitle } from '../../Preprints/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewMethodsAppropriateMatch, writeReviewResultsSupportedMatch } from '../../routes.js'
import { errorPrefix } from '../../shared-translation-elements.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { NonEmptyString } from '../../types/NonEmptyString.js'
import { prereviewOfSuffix } from '../shared-elements.js'

export interface ResultsSupportedForm {
  readonly resultsSupported: E.Either<
    MissingE,
    'not-supported' | 'partially-supported' | 'neutral' | 'well-supported' | 'strongly-supported' | 'skip' | undefined
  >
  readonly resultsSupportedNotSupportedDetails: E.Either<never, NonEmptyString | undefined>
  readonly resultsSupportedPartiallySupportedDetails: E.Either<never, NonEmptyString | undefined>
  readonly resultsSupportedNeutralDetails: E.Either<never, NonEmptyString | undefined>
  readonly resultsSupportedWellSupportedDetails: E.Either<never, NonEmptyString | undefined>
  readonly resultsSupportedStronglySupportedDetails: E.Either<never, NonEmptyString | undefined>
}

export function resultsSupportedForm(preprint: PreprintTitle, form: ResultsSupportedForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('conclusionsSupported')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${format(writeReviewResultsSupportedMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.resultsSupported)
                    ? html`
                        <li>
                          <a href="#results-supported-strongly-supported">
                            ${Match.valueTags(form.resultsSupported.left, {
                              MissingE: () => t('selectConclusionsSupported')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.resultsSupported) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.resultsSupported)
                  ? 'aria-invalid="true" aria-errormessage="results-supported-error"'
                  : '',
              )}
            >
              <legend>
                <h1>${t('conclusionsSupported')()}</h1>
              </legend>

              ${E.isLeft(form.resultsSupported)
                ? html`
                    <div class="error-message" id="results-supported-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.resultsSupported.left, {
                        MissingE: () => t('selectConclusionsSupported')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      id="results-supported-strongly-supported"
                      type="radio"
                      value="strongly-supported"
                      aria-describedby="results-supported-tip-strongly-supported"
                      aria-controls="results-supported-strongly-supported-control"
                      ${match(form.resultsSupported)
                        .with({ right: 'strongly-supported' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('conclusionsHighlySupported')()}</span>
                  </label>
                  <p id="results-supported-tip-strongly-supported" role="note">
                    ${t('conclusionsHighlySupportedTip')()}
                  </p>
                  <div class="conditional" id="results-supported-strongly-supported-control">
                    <div>
                      <label for="results-supported-strongly-supported-details" class="textarea"
                        >${t('conclusionsHighlySupportedWhy')()}</label
                      >

                      <textarea
                        name="resultsSupportedStronglySupportedDetails"
                        id="results-supported-strongly-supported-details"
                        rows="5"
                      >
${match(form.resultsSupportedStronglySupportedDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="well-supported"
                      aria-describedby="results-supported-tip-well-supported"
                      aria-controls="results-supported-well-supported-control"
                      ${match(form.resultsSupported)
                        .with({ right: 'well-supported' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('conclusionsSomewhatSupported')()}</span>
                  </label>
                  <p id="results-supported-tip-well-supported" role="note">${t('conclusionsSomewhatSupportedTip')()}</p>
                  <div class="conditional" id="results-supported-well-supported-control">
                    <div>
                      <label for="results-supported-well-supported-details" class="textarea"
                        >${t('conclusionsSomewhatSupportedWhy')()}</label
                      >

                      <textarea
                        name="resultsSupportedWellSupportedDetails"
                        id="results-supported-well-supported-details"
                        rows="5"
                      >
${match(form.resultsSupportedWellSupportedDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="neutral"
                      aria-describedby="results-supported-tip-neutral"
                      aria-controls="results-supported-neutral-control"
                      ${match(form.resultsSupported)
                        .with({ right: 'neutral' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('conclusionsNeitherSupportedNorUnsupported')()}</span>
                  </label>
                  <p id="results-supported-tip-neutral" role="note">
                    ${t('conclusionsNeitherSupportedNorUnsupportedTip')()}
                  </p>
                  <div class="conditional" id="results-supported-neutral-control">
                    <div>
                      <label for="results-supported-neutral-details" class="textarea"
                        >${t('conclusionsNeitherSupportedNorUnsupportedWhy')()}</label
                      >

                      <textarea name="resultsSupportedNeutralDetails" id="results-supported-neutral-details" rows="5">
${match(form.resultsSupportedNeutralDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="partially-supported"
                      aria-describedby="results-supported-tip-partially-supported"
                      aria-controls="results-supported-partially-supported-control"
                      ${match(form.resultsSupported)
                        .with({ right: 'partially-supported' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('conclusionsSomewhatUnsupported')()}</span>
                  </label>
                  <p id="results-supported-tip-partially-supported" role="note">
                    ${t('conclusionsSomewhatUnsupportedTip')()}
                  </p>
                  <div class="conditional" id="results-supported-partially-supported-control">
                    <div>
                      <label for="results-supported-partially-supported-details" class="textarea"
                        >${t('conclusionsSomewhatUnsupportedWhy')()}</label
                      >

                      <textarea
                        name="resultsSupportedPartiallySupportedDetails"
                        id="results-supported-partially-supported-details"
                        rows="5"
                      >
${match(form.resultsSupportedPartiallySupportedDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="resultsSupported"
                      type="radio"
                      value="not-supported"
                      aria-describedby="results-supported-tip-not-supported"
                      aria-controls="results-supported-not-supported-control"
                      ${match(form.resultsSupported)
                        .with({ right: 'not-supported' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('conclusionsHighlyUnsupported')()}</span>
                  </label>
                  <p id="results-supported-tip-not-supported" role="note">${t('conclusionsHighlyUnsupportedTip')()}</p>
                  <div class="conditional" id="results-supported-not-supported-control">
                    <div>
                      <label for="results-supported-not-supported-details" class="textarea"
                        >${t('conclusionsHighlyUnsupportedWhy')()}</label
                      >

                      <textarea
                        name="resultsSupportedNotSupportedDetails"
                        id="results-supported-not-supported-details"
                        rows="5"
                      >
${match(form.resultsSupportedNotSupportedDetails)
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
                      name="resultsSupported"
                      type="radio"
                      value="skip"
                      ${match(form.resultsSupported)
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
