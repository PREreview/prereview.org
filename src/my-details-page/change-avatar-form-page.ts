import { identity } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE, type TooBigE, type WrongTypeE } from '../form.js'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { changeAvatarMatch, myDetailsMatch } from '../routes.js'

export interface UploadAvatarForm {
  readonly avatar: E.Either<MissingE | WrongTypeE | TooBigE, unknown>
}

export function createPage({ form, locale }: { form: UploadAvatarForm; locale: SupportedLocale }) {
  const error = hasAnError(form)
  const t = translate(locale, 'my-details')

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText(t('uploadAnAvatar')({ error: error ? identity : () => '' })),
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back"><span>${t('back')()}</span></a>`,
    main: html`
      <single-use-form>
        <form
          method="post"
          action="${format(changeAvatarMatch.formatter, {})}"
          enctype="multipart/form-data"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${t('thereIsAProblem')()}</h2>
                  <ul>
                    ${E.isLeft(form.avatar)
                      ? html`
                          <li>
                            <a href="#avatar">
                              ${match(form.avatar.left)
                                .with({ _tag: 'MissingE' }, () => t('selectImageError')({ error: () => '' }))
                                .with({ _tag: 'WrongTypeE' }, () => t('imageTypeError')({ error: () => '' }))
                                .with({ _tag: 'TooBigE' }, () => t('imageSizeError')({ error: () => '', size: 5 }))
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.avatar) ? 'class="error"' : '')}>
            <h1><label for="avatar">${t('uploadAnAvatar')({ error: () => '' })}</label></h1>

            <p id="avatar-tip" role="note">${t('youCanUploadAvatar')({ size: 5 })}</p>

            <details>
              <summary><span>${t('whereWillItShow')()}</span></summary>

              <div>
                <p>${t('showOnPublicProfile')()}</p>
              </div>
            </details>

            ${E.isLeft(form.avatar)
              ? html`
                  <div class="error-message" id="review-error">
                    ${rawHtml(
                      match(form.avatar.left)
                        .with({ _tag: 'MissingE' }, () => t('selectImageError')({ error: visuallyHidden }))
                        .with({ _tag: 'WrongTypeE' }, () => t('imageTypeError')({ error: visuallyHidden }))
                        .with({ _tag: 'TooBigE' }, () => t('imageSizeError')({ error: visuallyHidden, size: 5 }))
                        .exhaustive(),
                    )}
                  </div>
                `
              : ''}

            <input
              name="avatar"
              id="avatar"
              type="file"
              accept="image/*"
              aria-describedby="avatar-tip"
              ${E.isLeft(form.avatar) ? html`aria-invalid="true" aria-errormessage="review-error"` : ''}
            />
          </div>

          <button>${t('saveAndContinueButton')()}</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    canonical: format(changeAvatarMatch.formatter, {}),
    js: error ? ['error-summary.js', 'single-use-form.js'] : ['single-use-form.js'],
  })
}

const visuallyHidden = (text: string) => html`<span class="visually-hidden">${text}</span>`.toString()
