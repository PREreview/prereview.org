import { Either, Function, identity, Match, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import type * as EnterEmailAddressForm from './EnterEmailAddressForm.js'

export const EnterEmailAddressPage = ({
  commentId,
  form,
  locale,
}: {
  commentId: Uuid.Uuid
  form: EnterEmailAddressForm.EnterEmailAddressForm
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: plainText(
      translate(
        locale,
        'write-comment-flow',
        'contactDetailsTitle',
      )({ error: form._tag === 'InvalidForm' ? identity : () => '' }),
    ),
    nav: html`
      <a href="${Routes.WriteCommentCodeOfConduct.href({ commentId })}" class="back"
        >${translate(locale, 'write-comment-flow', 'back')()}</a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteCommentEnterEmailAddress.href({ commentId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'write-comment-flow', 'errorSummaryHeading')()}</h2>
                <ul>
                  ${Either.isLeft(form.emailAddress)
                    ? html`
                        <li>
                          <a href="#email-address">
                            ${pipe(
                              Match.value(form.emailAddress.left),
                              Match.tag('Missing', () =>
                                translate(locale, 'write-comment-flow', 'errorEnterEmailAddress')({ error: () => '' }),
                              ),
                              Match.tag('Invalid', () =>
                                translate(
                                  locale,
                                  'write-comment-flow',
                                  'errorEnterValidEmailAddress',
                                )({ error: () => '' }),
                              ),
                              Match.exhaustive,
                            )}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <h1>${translate(locale, 'write-comment-flow', 'contactDetailsTitle')({ error: () => '' })}</h1>

        <p>${translate(locale, 'write-comment-flow', 'needToConfirmEmailAddress')()}</p>

        <p>${translate(locale, 'write-comment-flow', 'emailAddressUse')()}</p>

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <h2>
            <label for="email-address"
              >${translate(locale, 'write-comment-flow', 'whatIsYourEmailAddressTitle')()}</label
            >
          </h2>

          ${form._tag === 'InvalidForm' && Either.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  ${pipe(
                    Match.value(form.emailAddress.left),
                    Match.tag('Missing', () => translate(locale, 'write-comment-flow', 'errorEnterEmailAddress')),
                    Match.tag('Invalid', () => translate(locale, 'write-comment-flow', 'errorEnterValidEmailAddress')),
                    Match.exhaustive,
                    Function.apply({ error: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                    rawHtml,
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
            ${pipe(
              Match.value(form),
              Match.tag('CompletedForm', form => html`value="${form.emailAddress}"`),
              Match.when(
                { _tag: 'InvalidForm', emailAddress: { _tag: 'Left', left: { _tag: 'Invalid' } } },
                form => html`value="${form.emailAddress.left.value}"`,
              ),
              Match.orElse(() => ''),
            )}
            ${form._tag === 'InvalidForm' && Either.isLeft(form.emailAddress)
              ? html`aria-invalid="true" aria-errormessage="email-address-error"`
              : ''}
          />
        </div>

        <button>${translate(locale, 'write-comment-flow', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
  })
