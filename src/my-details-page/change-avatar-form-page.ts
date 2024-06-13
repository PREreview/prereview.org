import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { type MissingE, type TooBigE, type WrongTypeE, hasAnError } from '../form.js'
import { html, plainText, rawHtml } from '../html.js'
import { PageResponse } from '../response.js'
import { changeAvatarMatch, myDetailsMatch } from '../routes.js'

export interface UploadAvatarForm {
  readonly avatar: E.Either<MissingE | WrongTypeE | TooBigE, unknown>
}

export function createPage({ form }: { form: UploadAvatarForm }) {
  const error = hasAnError(form)

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Upload an avatar`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
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
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.avatar)
                      ? html`
                          <li>
                            <a href="#avatar">
                              ${match(form.avatar.left)
                                .with({ _tag: 'MissingE' }, () => 'Select an image')
                                .with(
                                  { _tag: 'WrongTypeE' },
                                  () => 'The selected file must be a AVIF, HEIC, JPG, PNG or WebP',
                                )
                                .with({ _tag: 'TooBigE' }, () => 'The selected file must be smaller than 5 MB')
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
            <h1><label for="avatar">Upload an avatar</label></h1>

            <p id="avatar-tip" role="note">
              You can upload a photo or image to use as your avatar. The selected file must be smaller than 5&nbsp;MB.
            </p>

            <details>
              <summary><span>Where will it show?</span></summary>

              <div>
                <p>We’ll show your avatar on your public profile.</p>
              </div>
            </details>

            ${E.isLeft(form.avatar)
              ? html`
                  <div class="error-message" id="review-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.avatar.left)
                      .with({ _tag: 'MissingE' }, () => 'Select an image')
                      .with({ _tag: 'WrongTypeE' }, () => 'The selected file must be a AVIF, HEIC, JPG, PNG or WebP')
                      .with({ _tag: 'TooBigE' }, () => 'The selected file must be smaller than 5 MB')
                      .exhaustive()}
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

          <button>Save and continue</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    canonical: format(changeAvatarMatch.formatter, {}),
    js: error ? ['error-summary.js', 'single-use-form.js'] : ['single-use-form.js'],
  })
}
