import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { type MissingE, type TooBigE, type WrongTypeE, hasAnError } from '../form'
import { html, plainText, rawHtml } from '../html'
import { PageResponse } from '../response'
import { changeAvatarMatch, myDetailsMatch } from '../routes'

export interface UploadAvatarForm {
  readonly avatar: E.Either<MissingE | WrongTypeE | TooBigE, undefined>
}

export function createPage({ form }: { form: UploadAvatarForm }) {
  const error = hasAnError(form)

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Upload an avatar`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeAvatarMatch.formatter, {})}" enctype="multipart/form-data" novalidate>
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
                              .with({ _tag: 'WrongTypeE' }, () => 'The selected file must be a JPG')
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

          ${E.isLeft(form.avatar)
            ? html`
                <div class="error-message" id="review-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.avatar.left)
                    .with({ _tag: 'MissingE' }, () => 'Select an image')
                    .with({ _tag: 'WrongTypeE' }, () => 'The selected file must be a JPG')
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
            ${E.isLeft(form.avatar) ? html`aria-invalid="true" aria-errormessage="review-error"` : ''}
          />
        </div>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeAvatarMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}
