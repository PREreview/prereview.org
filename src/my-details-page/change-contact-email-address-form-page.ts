import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import { type InvalidE, type MissingE, hasAnError } from '../form.js'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'
import { changeContactEmailAddressMatch, myDetailsMatch } from '../routes.js'
import type { EmailAddress } from '../types/email-address.js'

interface ChangeContactEmailAddressForm {
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

export const createFormPage = (form: ChangeContactEmailAddressForm) => {
  const error = hasAnError(form)

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}What is your email address?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>Back</span></a>`,
    main: html`
      <form method="post" action="${format(changeContactEmailAddressMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.emailAddress)
                    ? html`
                        <li>
                          <a href="#email-address">
                            ${match(form.emailAddress.left)
                              .with({ _tag: 'MissingE' }, () => 'Enter your email address')
                              .with(
                                { _tag: 'InvalidE' },
                                () => 'Enter an email address in the correct format, like name@example.com',
                              )
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
          <h1><label for="email-address">What is your email address?</label></h1>

          <p id="email-address-tip" role="note">
            We’ll only use this to contact you about your account and PREreviews.
          </p>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.emailAddress.left)
                    .with({ _tag: 'MissingE' }, () => 'Enter your email address')
                    .with(
                      { _tag: 'InvalidE' },
                      () => 'Enter an email address in the correct format, like name@example.com',
                    )
                    .exhaustive()}
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

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeContactEmailAddressMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}
