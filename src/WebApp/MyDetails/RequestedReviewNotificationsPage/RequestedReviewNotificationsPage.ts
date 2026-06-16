import { Either, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, RequestedReviewNotificationsForm } from './RequestedReviewNotificationsForm.ts'

export function RequestedReviewNotificationsPage({
  form,
  locale,
}: {
  form: RequestedReviewNotificationsForm
  locale: SupportedLocale
}) {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'my-details')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('receiveRequestedReviewNotifications')(), errorPrefix(locale, hasAnError), plainText),
    nav: html` <a href="${format(Routes.myDetailsMatch.formatter, {})}" class="back">${t('forms', 'backLink')()}</a> `,
    main: html`
      <form method="post" action="${Routes.ChangeRequestedReviewNotifications}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(hasAnError ? 'class="error"' : '')}>
          <fieldset
            role="group"
            aria-describedby="requested-review-notifications-tip"
            ${rawHtml(hasAnError ? 'aria-invalid="true" aria-errormessage="requested-review-notifications-error"' : '')}
          >
            <legend>
              <h1>${t('receiveRequestedReviewNotifications')()}</h1>
            </legend>

            ${hasAnError && Either.isLeft(form.requestedReviewNotifications)
              ? html`
                  <div class="error-message" id="requested-review-notifications-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.requestedReviewNotifications.left, {
                      Missing: () => t('selectReceiveRequestedReviewNotificationsError')(),
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="requestedReviewNotifications"
                    id="requested-review-notifications-yes"
                    type="radio"
                    value="yes"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        {
                          _tag: 'CompletedForm',
                          requestedReviewNotifications: notifications => notifications === 'yes',
                        },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${t('yes')()}
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="requestedReviewNotifications"
                    type="radio"
                    value="no"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        {
                          _tag: 'CompletedForm',
                          requestedReviewNotifications: notifications => notifications === 'no',
                        },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${t('no')()}
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ChangeRequestedReviewNotifications,
    skipToLabel: 'form',
    js: hasAnError ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) => html`
  ${Either.isLeft(form.requestedReviewNotifications)
    ? html`
        <li>
          <a href="#requested-review-notifications-yes">
            ${Match.valueTags(form.requestedReviewNotifications.left, {
              Missing: () => translate(locale, 'my-details', 'selectReceiveRequestedReviewNotificationsError')(),
            })}
          </a>
        </li>
      `
    : ''}
`
