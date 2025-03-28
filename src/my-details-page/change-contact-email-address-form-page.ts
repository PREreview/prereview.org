import { identity } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import { hasAnError, type InvalidE, type MissingE } from '../form.js'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeContactEmailAddressMatch, myDetailsMatch } from '../routes.js'
import type { EmailAddress } from '../types/email-address.js'

interface ChangeContactEmailAddressForm {
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

export const createFormPage = (form: ChangeContactEmailAddressForm, locale: SupportedLocale) => {
  const error = hasAnError(form)
  const t = translate(locale, 'my-details')

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText(t('whatEmailAddress')({ error: error ? identity : () => '' })),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>${t('back')()}</span></a>`,
    main: html`
      <form method="post" action="${format(changeContactEmailAddressMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${t('thereIsAProblem')()}</h2>
                <ul>
                  ${E.isLeft(form.emailAddress)
                    ? html`
                        <li>
                          <a href="#email-address">
                            ${match(form.emailAddress.left)
                              .with({ _tag: 'MissingE' }, () => t('enterEmailAddressError')({ error: () => '' }))
                              .with({ _tag: 'InvalidE' }, () => t('enterEmailAddressFormatError')({ error: () => '' }))
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${error ? html`class="error"` : ''}>
          <h1><label for="email-address">${t('whatEmailAddress')({ error: () => '' })}</label></h1>

          <p id="email-address-tip" role="note">${t('usedToContactYouAboutYourAccountAndPrereviews')()}</p>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  ${rawHtml(
                    match(form.emailAddress.left)
                      .with({ _tag: 'MissingE' }, () => t('enterEmailAddressError')({ error: visuallyHidden }))
                      .with({ _tag: 'InvalidE' }, () => t('enterEmailAddressFormatError')({ error: visuallyHidden }))
                      .exhaustive(),
                  )}
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

        <button>${t('saveAndContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeContactEmailAddressMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}

const visuallyHidden = (text: string) => html`<span class="visually-hidden">${text}</span>`.toString()
