import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form'
import { html, plainText, rawHtml } from '../../html'
import type { PreprintTitle } from '../../preprint'
import { StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorMatch, writeReviewAddAuthorsMatch, writeReviewAuthorsMatch } from '../../routes'

interface AddAuthorsForm {
  readonly anotherAuthor: E.Either<MissingE, 'yes' | 'no' | undefined>
}

export function addAuthorsForm({ form, preprint }: { form: AddAuthorsForm; preprint: PreprintTitle }) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Do you need to add another author? – PREreview of “${preprint.title}”`,
    nav: html`<a href="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.anotherAuthor)
                    ? html`
                        <li>
                          <a href="#another-author-no">
                            ${match(form.anotherAuthor.left)
                              .with({ _tag: 'MissingE' }, () => 'Select yes if you need to add another author')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.anotherAuthor) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(
              E.isLeft(form.anotherAuthor) ? 'aria-invalid="true" aria-errormessage="another-author-error"' : '',
            )}
          >
            <legend><h1>Do you need to add another author?</h1></legend>

            ${E.isLeft(form.anotherAuthor)
              ? html`
                  <div class="error-message" id="another-author-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.anotherAuthor.left)
                      .with({ _tag: 'MissingE' }, () => 'Select yes if you need to add another author')
                      .exhaustive()}
                  </div>
                `
              : ''}
            <ol>
              <li>
                <label>
                  <input
                    name="anotherAuthor"
                    id="another-author-no"
                    type="radio"
                    value="no"
                    ${match(form.anotherAuthor)
                      .with({ right: 'no' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>No</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="anotherAuthor"
                    id="another-author-yes"
                    type="radio"
                    value="yes"
                    ${match(form.anotherAuthor)
                      .with({ right: 'yes' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Yes</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Continue</button>
      </form>
    `,
    canonical: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: ['error-summary.js'],
  })
}