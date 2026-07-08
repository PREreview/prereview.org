import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { InvalidForm, ReceiveNotificationsForm } from './ReceiveNotificationsForm.ts'

export function renderReceiveNotificationsPage({
  form,
  locale,
  preprintId,
}: {
  form: ReceiveNotificationsForm
  locale: SupportedLocale
  preprintId: PreprintId
}) {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('beNotifiedWhenReviewPublished')(), errorPrefix(locale, hasAnError), plainText),
    main: html`
      <form method="post" action="${Routes.RequestAReviewReceiveNotifications.href({ preprintId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(hasAnError ? 'class="error"' : '')}>
          <fieldset
            role="group"
            aria-describedby="receive-notifications-tip"
            ${rawHtml(hasAnError ? 'aria-invalid="true" aria-errormessage="receive-notifications-error"' : '')}
          >
            <legend>
              <h1>${t('beNotifiedWhenReviewPublished')()}</h1>
            </legend>

            ${
              hasAnError && Either.isLeft(form.receiveNotifications)
                ? html`
                    <div class="error-message" id="receive-notifications-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.receiveNotifications.left, {
                        Missing: () => t('beNotifiedWhenReviewPublishedMissing')(),
                      })}
                    </div>
                  `
                : ''
            }

            <p>${t('canContactWhenReviewPublished')()}</p>

            <p>${t('canChangeContactWhenReviewPublished')()}</p>

            <ol>
              <li>
                <label>
                  <input
                    name="receiveNotifications"
                    id="receive-notifications-yes"
                    type="radio"
                    value="yes"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        {
                          _tag: 'CompletedForm',
                          receiveNotifications: notifications => notifications === 'yes',
                        },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${t('beNotifiedWhenReviewPublishedYes')()}
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="receiveNotifications"
                    type="radio"
                    value="no"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        {
                          _tag: 'CompletedForm',
                          receiveNotifications: notifications => notifications === 'no',
                        },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${t('beNotifiedWhenReviewPublishedNo')()}
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${t('forms', 'saveContinueButton')()}</button>
      </form>
    `,
    canonical: Routes.RequestAReviewReceiveNotifications.href({ preprintId }),
    skipToLabel: 'form',
    js: hasAnError ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) => html`
  ${
    Either.isLeft(form.receiveNotifications)
      ? html`
          <li>
            <a href="#receive-notifications-yes">
              ${Match.valueTags(form.receiveNotifications.left, {
                Missing: () => translate(locale, 'request-review-flow', 'beNotifiedWhenReviewPublishedMissing')(),
              })}
            </a>
          </li>
        `
      : ''
  }
`
