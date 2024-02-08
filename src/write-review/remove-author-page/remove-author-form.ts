import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form'
import { html, plainText, rawHtml } from '../../html'
import type { PreprintTitle } from '../../preprint'
import { StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorsMatch, writeReviewRemoveAuthorMatch } from '../../routes'
import type { NonEmptyString } from '../../types/string'

export function removeAuthorForm({
  author,
  form,
  number,
  preprint,
}: {
  author: { name: NonEmptyString }
  form: RemoveAuthorForm
  number: number
  preprint: PreprintTitle
}) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Are you sure you want to remove ${author.name}? – PREreview of “${preprint.title}”`,
    nav: html`<a href="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>`,
    main: html`
      <form
        method="post"
        action="${format(writeReviewRemoveAuthorMatch.formatter, { id: preprint.id, number })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.removeAuthor)
                    ? html`
                        <li>
                          <a href="#remove-author-no">
                            ${match(form.removeAuthor.left)
                              .with({ _tag: 'MissingE' }, () => `Select yes if you want to remove ${author.name}`)
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.removeAuthor) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(E.isLeft(form.removeAuthor) ? 'aria-invalid="true" aria-errormessage="remove-author-error"' : '')}
          >
            <legend><h1>Are you sure you want to remove ${author.name}?</h1></legend>

            ${E.isLeft(form.removeAuthor)
              ? html`
                  <div class="error-message" id="remove-author-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.removeAuthor.left)
                      .with({ _tag: 'MissingE' }, () => `Select yes if you want to remove ${author.name}`)
                      .exhaustive()}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="removeAuthor"
                    id="remove-author-no"
                    type="radio"
                    value="no"
                    ${match(form.removeAuthor)
                      .with({ right: 'no' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>No</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="removeAuthor"
                    id="remove-author-yes"
                    type="radio"
                    value="yes"
                    ${match(form.removeAuthor)
                      .with({ right: 'yes' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Yes</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: format(writeReviewRemoveAuthorMatch.formatter, { id: preprint.id, number }),
    skipToLabel: 'form',
    js: error ? ['error-summary.js'] : [],
  })
}
export interface RemoveAuthorForm {
  readonly removeAuthor: E.Either<MissingE, 'yes' | 'no' | undefined>
}
