import { Match, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { PreprintTitle } from '../../Preprints/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewLanguageEditingMatch, writeReviewNovelMatch } from '../../routes.js'
import { errorPrefix } from '../../shared-translation-elements.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { NonEmptyString } from '../../types/NonEmptyString.js'
import { prereviewOfSuffix } from '../shared-elements.js'

export interface LanguageEditingForm {
  readonly languageEditing: E.Either<MissingE, 'no' | 'yes' | undefined>
  readonly languageEditingNoDetails: E.Either<never, NonEmptyString | undefined>
  readonly languageEditingYesDetails: E.Either<never, NonEmptyString | undefined>
}

export function languageEditingForm(preprint: PreprintTitle, form: LanguageEditingForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('benefitFromEditing')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.languageEditing)
                    ? html`
                        <li>
                          <a href="#language-editing-no">
                            ${Match.valueTags(form.languageEditing.left, {
                              MissingE: () => t('selectBenefitFromEditing')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.languageEditing) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.languageEditing) ? 'aria-invalid="true" aria-errormessage="language-editing-error"' : '',
              )}
            >
              <legend>
                <h1>${t('benefitFromEditing')()}</h1>
              </legend>

              ${E.isLeft(form.languageEditing)
                ? html`
                    <div class="error-message" id="language-editing-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.languageEditing.left, {
                        MissingE: () => t('selectBenefitFromEditing')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="languageEditing"
                      id="language-editing-no"
                      type="radio"
                      value="no"
                      aria-describedby="language-editing-tip-no"
                      aria-controls="language-editing-no-control"
                      ${match(form.languageEditing)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('no')()}</span>
                  </label>
                  <p id="language-editing-tip-no" role="note">${t('benefitFromEditingNoTip')()}</p>
                  <div class="conditional" id="language-editing-no-control">
                    <div>
                      <label for="language-editing-no-details" class="textarea"
                        >${t('benefitFromEditingNoWhy')()}</label
                      >

                      <textarea name="languageEditingNoDetails" id="language-editing-no-details" rows="5">
${match(form.languageEditingNoDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="languageEditing"
                      type="radio"
                      value="yes"
                      aria-describedby="language-editing-tip-yes"
                      aria-controls="language-editing-yes-control"
                      ${match(form.languageEditing)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('yes')()}</span>
                  </label>
                  <p id="language-editing-tip-yes" role="note">${t('benefitFromEditingYesTip')()}</p>
                  <div class="conditional" id="language-editing-yes-control">
                    <div>
                      <label for="language-editing-yes-details" class="textarea"
                        >${t('benefitFromEditingYesWhy')()}</label
                      >

                      <textarea name="languageEditingYesDetails" id="language-editing-yes-details" rows="5">
${match(form.languageEditingYesDetails)
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
