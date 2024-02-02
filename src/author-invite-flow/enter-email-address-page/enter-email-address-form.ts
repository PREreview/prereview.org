import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type InvalidE, type MissingE, hasAnError } from '../../form'
import { html, plainText, rawHtml } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { authorInviteEnterEmailAddressMatch } from '../../routes'
import type { EmailAddress } from '../../types/email-address'

export interface EnterEmailAddressForm {
  readonly useInvitedAddress: E.Either<MissingE, 'yes' | 'no' | undefined>
  readonly otherEmailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

export function enterEmailAddressForm({
  form,
  inviteId,
  invitedEmailAddress,
}: {
  form: EnterEmailAddressForm
  inviteId: Uuid
  invitedEmailAddress: EmailAddress
}) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Contact details`,
    main: html`
      <form method="post" action="${format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.useInvitedAddress)
                    ? html`
                        <li>
                          <a href="#use-invited-address-yes">
                            ${match(form.useInvitedAddress.left)
                              .with({ _tag: 'MissingE' }, () => 'Select the email address that you would like to use')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                  ${E.isLeft(form.otherEmailAddress)
                    ? html`
                        <li>
                          <a href="#other-email-address">
                            ${match(form.otherEmailAddress.left)
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

        <h1>Contact details</h1>

        <p>We’re ready to add your name to the PREreview, but we need to confirm your email address first.</p>

        <p>We’ll only use this to contact you about your account and PREreviews.</p>

        <div ${rawHtml(E.isLeft(form.useInvitedAddress) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              aria-describedby="use-invited-address-tip"
              ${rawHtml(
                E.isLeft(form.useInvitedAddress)
                  ? 'aria-invalid="true" aria-errormessage="use-invited-address-error"'
                  : '',
              )}
            >
              <legend>
                <h2>What email address should we use?</h2>
              </legend>

              ${E.isLeft(form.useInvitedAddress)
                ? html`
                    <div class="error-message" id="use-invited-address-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.useInvitedAddress.left)
                        .with({ _tag: 'MissingE' }, () => 'Select the email address that you would like to use')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="useInvitedAddress"
                      id="use-invited-address-yes"
                      type="radio"
                      value="yes"
                      ${match(form.useInvitedAddress)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${invitedEmailAddress}</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="useInvitedAddress"
                      type="radio"
                      value="no"
                      aria-controls="other-email-address-control"
                      ${match(form.useInvitedAddress)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>A different one</span>
                  </label>
                  <div class="conditional" id="other-email-address-control">
                    <div ${rawHtml(E.isLeft(form.otherEmailAddress) ? 'class="error"' : '')}>
                      <label for="other-email-address" class="textarea">What is your email address?</label>

                      ${E.isLeft(form.otherEmailAddress)
                        ? html`
                            <div class="error-message" id="other-email-address-error">
                              <span class="visually-hidden">Error:</span>
                              ${match(form.otherEmailAddress.left)
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
                        name="otherEmailAddress"
                        id="other-email-address"
                        type="text"
                        inputmode="email"
                        spellcheck="false"
                        autocomplete="email"
                        ${match(form.otherEmailAddress)
                          .with({ right: P.select(P.string) }, value => html`value="${value}"`)
                          .with({ right: undefined }, () => '')
                          .with({ left: { _tag: 'MissingE' } }, () => '')
                          .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
                          .exhaustive()}
                        ${E.isLeft(form.otherEmailAddress)
                          ? html`aria-invalid="true" aria-errormessage="other-email-address-error"`
                          : ''}
                      />
                    </div>
                  </div>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
    skipToLabel: 'form',
    js: error ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
  })
}
