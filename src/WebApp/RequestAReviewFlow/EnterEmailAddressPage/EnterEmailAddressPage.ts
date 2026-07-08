import { Either, Match, pipe } from 'effect'
import { html, plainText } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { EnterEmailAddressForm } from './EnterEmailAddressForm.ts'

export const renderEnterEmailAddressPage = ({
  preprintId,
  form,
  locale,
}: {
  preprintId: IndeterminatePreprintId
  form: EnterEmailAddressForm
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('contactDetails')(), errorPrefix(locale, form._tag === 'InvalidForm'), plainText),
    main: html`
      <form method="post" action="${Routes.RequestAReviewEnterEmailAddress.href({ preprintId })}" novalidate>
        ${
          form._tag === 'InvalidForm'
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${t('forms', 'errorSummaryTitle')()}</h2>
                  <ul>
                    ${
                      Either.isLeft(form.emailAddress)
                        ? html`
                            <li>
                              <a href="#email-address">
                                ${Match.valueTags(form.emailAddress.left, {
                                  Missing: () => t('whatIsYourEmailAddressErrorMissing')(),
                                  Invalid: () =>
                                    t('whatIsYourEmailAddressErrorInvalid')({
                                      exampleEmailAddress: html`<bdi>name@example.com</bdi>`,
                                    }),
                                })}
                              </a>
                            </li>
                          `
                        : ''
                    }
                  </ul>
                </error-summary>
              `
            : ''
        }

        <h1>${t('contactDetails')()}</h1>

        <p>${t('confirmEmailAddressFirst')()}</p>

        <p>${t('onlyUseToContactYou')()}</p>

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <h2>
            <label for="email-address">${t('whatIsYourEmailAddress')()}</label>
          </h2>

          ${
            form._tag === 'InvalidForm' && Either.isLeft(form.emailAddress)
              ? html`
                  <div class="error-message" id="email-address-error">
                    <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.emailAddress.left, {
                      Missing: () => t('whatIsYourEmailAddressErrorMissing')(),
                      Invalid: () =>
                        t('whatIsYourEmailAddressErrorInvalid')({
                          exampleEmailAddress: html`<bdi>name@example.com</bdi>`,
                        }),
                    })}
                  </div>
                `
              : ''
          }

          <input
            name="emailAddress"
            id="email-address"
            type="text"
            inputmode="email"
            dir="ltr"
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
            ${
              form._tag === 'InvalidForm' && Either.isLeft(form.emailAddress)
                ? html`aria-invalid="true" aria-errormessage="email-address-error"`
                : ''
            }
          />
        </div>

        <button>${t('forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.RequestAReviewEnterEmailAddress.href({ preprintId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
  })
}
