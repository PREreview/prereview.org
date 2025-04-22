import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { hasAnError, type InvalidE, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { authorInviteEnterEmailAddressMatch } from '../../routes.js'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../shared-translation-elements.js'
import type { EmailAddress } from '../../types/email-address.js'

export interface EnterEmailAddressForm {
  readonly useInvitedAddress: E.Either<MissingE, 'yes' | 'no' | undefined>
  readonly otherEmailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

export function enterEmailAddressForm({
  form,
  inviteId,
  invitedEmailAddress,
  locale,
}: {
  form: EnterEmailAddressForm
  inviteId: Uuid
  invitedEmailAddress: EmailAddress
  locale: SupportedLocale
}) {
  const error = hasAnError(form)
  const t = translate(locale, 'author-invite-flow')

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: pipe(t('contactDetails')(), errorPrefix(locale, error), plainText),
    main: html`
      <form method="post" action="${format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <h1>${t('contactDetails')()}</h1>

        <p>${t('readyToAddYourNameConfirmYourEmailFirst')()}</p>

        <p>${t('usedToContactYouAboutYourAccountAndPrereviews')()}</p>

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
                <h2>${t('whatEmailAddressShouldWeUse')()}</h2>
              </legend>

              ${E.isLeft(form.useInvitedAddress)
                ? html`
                    <div class="error-message" id="use-invited-address-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${match(form.useInvitedAddress.left)
                        .with({ _tag: 'MissingE' }, t('selectTheEmailAddressYouWouldLikeToUse'))
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
                    <span>${t('aDifferentOne')()}</span>
                  </label>
                  <div class="conditional" id="other-email-address-control">
                    <div ${rawHtml(E.isLeft(form.otherEmailAddress) ? 'class="error"' : '')}>
                      <label for="other-email-address" class="textarea">${t('whatIsYourEmailAddress')()}</label>

                      ${E.isLeft(form.otherEmailAddress)
                        ? html`
                            <div class="error-message" id="other-email-address-error">
                              <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                              ${match(form.otherEmailAddress.left)
                                .with({ _tag: 'MissingE' }, t('enterYourEmailAddress'))
                                .with({ _tag: 'InvalidE' }, t('enterAnEmailAddressInTheCorrectFormat'))
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

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: format(authorInviteEnterEmailAddressMatch.formatter, { id: inviteId }),
    skipToLabel: 'form',
    js: error ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: EnterEmailAddressForm) => {
  const t = translate(locale, 'author-invite-flow')
  return html`
    ${E.isLeft(form.useInvitedAddress)
      ? html`
          <li>
            <a href="#use-invited-address-yes">
              ${match(form.useInvitedAddress.left)
                .with({ _tag: 'MissingE' }, t('selectTheEmailAddressYouWouldLikeToUse'))
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
                .with({ _tag: 'MissingE' }, t('enterYourEmailAddress'))
                .with({ _tag: 'InvalidE' }, t('enterAnEmailAddressInTheCorrectFormat'))
                .exhaustive()}
            </a>
          </li>
        `
      : ''}
  `
}
