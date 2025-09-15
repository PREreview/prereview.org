import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match, P } from 'ts-pattern'
import { hasAnError, type InvalidE, type MissingE } from '../../form.js'
import { html, plainText } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { PreprintTitle } from '../../Preprints/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewConductMatch, writeReviewEnterEmailAddressMatch } from '../../routes.js'
import { errorPrefix } from '../../shared-translation-elements.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { EmailAddress } from '../../types/EmailAddress.js'
import { prereviewOfSuffix } from '../shared-elements.js'

export interface EnterEmailAddressForm {
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

export const enterEmailAddressPage = (
  preprint: PreprintTitle,
  form: EnterEmailAddressForm,
  locale: SupportedLocale,
) => {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('contactDetails')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`<a href="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form
        method="post"
        action="${format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.emailAddress)
                    ? html`
                        <li>
                          <a href="#email-address">
                            ${Match.valueTags(form.emailAddress.left, {
                              MissingE: () => t('enterEmailAddressError')(),
                              InvalidE: () => t('enterEmailAddressFormatError')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <h1>${t('contactDetails')()}</h1>

        <p>${t('confirmEmailAddress')()}</p>

        <p>${t('onlyUseContact')()}</p>

        <div ${error ? html`class="error"` : ''}>
          <h2><label for="email-address">${t('whatIsYourEmail')()}</label></h2>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.emailAddress.left, {
                    MissingE: () => t('enterEmailAddressError')(),
                    InvalidE: () => t('enterEmailAddressFormatError')(),
                  })}
                </div>
              `
            : ''}

          <input
            name="emailAddress"
            id="email-address"
            type="text"
            inputmode="email"
            spellcheck="false"
            autocomplete="email"
            ${match(form.emailAddress)
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ right: undefined }, () => '')
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
              .exhaustive()}
            ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
          />
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: error ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
