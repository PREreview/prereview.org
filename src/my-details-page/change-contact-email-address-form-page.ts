import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import { hasAnError, type InvalidE, type MissingE } from '../form.js'
import { html, plainText } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeContactEmailAddressMatch, myDetailsMatch } from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type { EmailAddress } from '../types/email-address.js'

interface ChangeContactEmailAddressForm {
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

export const createFormPage = (form: ChangeContactEmailAddressForm, locale: SupportedLocale) => {
  const error = hasAnError(form)
  const t = translate(locale, 'my-details')

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: pipe(t('whatEmailAddress')(), errorPrefix(locale, error), plainText),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(changeContactEmailAddressMatch.formatter, {})}" novalidate>
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

        <div ${error ? html`class="error"` : ''}>
          <h1><label for="email-address">${t('whatEmailAddress')()}</label></h1>

          <p id="email-address-tip" role="note">${t('usedToContactYouAboutYourAccountAndPrereviews')()}</p>

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
            aria-describedby="email-address-tip"
            ${match(form.emailAddress)
              .with({ right: undefined }, () => '')
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
              .exhaustive()}
            ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
          />
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeContactEmailAddressMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}
