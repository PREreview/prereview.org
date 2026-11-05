import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PageResponse } from '../../Response/index.ts'
import type { EmptyForm, InvalidForm } from './AvatarForm.ts'

export function AvatarPage({ form, locale }: { form: EmptyForm | InvalidForm; locale: SupportedLocale }) {
  const error = form._tag === 'InvalidForm'
  const t = translate(locale, 'my-details')

  const size = (5).toLocaleString(locale, { style: 'unit', unit: 'megabyte' })

  return PageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('uploadAnAvatar')(), errorPrefix(locale, error), plainText),
    nav: html`<a href="${format(Routes.myDetailsMatch.formatter, {})}" class="back"
      >${translate(locale, 'forms', 'backLink')()}</a
    >`,
    main: html`
      <single-use-form>
        <form method="post" action="${Routes.ChangeAvatar}" enctype="multipart/form-data" novalidate>
          ${
            error
              ? html`
                  <error-summary aria-labelledby="error-summary-title" role="alert">
                    <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                    <ul>
                      <li>
                        <a href="#avatar">
                          ${Match.valueTags(form.avatar, {
                            Missing: () => t('selectImageError')(),
                            WrongType: () => t('imageTypeError')(),
                            TooBig: () =>
                              t('imageSizeError')({
                                size,
                              }),
                          })}
                        </a>
                      </li>
                    </ul>
                  </error-summary>
                `
              : ''
          }

          <div ${rawHtml(form._tag === 'InvalidForm' ? 'class="error"' : '')}>
            <h1><label for="avatar">${t('uploadAnAvatar')()}</label></h1>

            <p id="avatar-tip" role="note">${t('youCanUploadAvatar')({ size })}</p>

            <details>
              <summary>${t('whereWillItShow')()}</summary>

              <div>
                <p>${t('showOnPublicProfile')()}</p>
              </div>
            </details>

            ${
              form._tag === 'InvalidForm'
                ? html`
                    <div class="error-message" id="avatar-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.avatar, {
                        Missing: () => t('selectImageError')(),
                        WrongType: () => t('imageTypeError')(),
                        TooBig: () => t('imageSizeError')({ size }),
                      })}
                    </div>
                  `
                : ''
            }

            <input
              name="avatar"
              id="avatar"
              type="file"
              accept="image/*"
              aria-describedby="avatar-tip"
              ${form._tag === 'InvalidForm' ? html`aria-invalid="true" aria-errormessage="avatar-error"` : ''}
            />
          </div>

          <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    canonical: Routes.ChangeAvatar,
    js: error ? ['error-summary.js', 'single-use-form.js'] : ['single-use-form.js'],
  })
}
