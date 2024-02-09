import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import { type InvalidE, type MissingE, hasAnError } from '../../form'
import { html, plainText, rawHtml } from '../../html'
import type { PreprintTitle } from '../../preprint'
import { StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorsMatch, writeReviewChangeAuthorMatch } from '../../routes'
import type { EmailAddress } from '../../types/email-address'
import type { NonEmptyString } from '../../types/string'

export function changeAuthorForm({
  author,
  form,
  number,
  preprint,
}: {
  author: { name: NonEmptyString }
  form: ChangeAuthorForm
  number: number
  preprint: PreprintTitle
}) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Change ${author.name}’s details – PREreview of “${preprint.title}”`,
    nav: html`<a href="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>`,
    main: html`
      <form
        method="post"
        action="${format(writeReviewChangeAuthorMatch.formatter, { id: preprint.id, number })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.name)
                    ? html`
                        <li>
                          <a href="#name">
                            ${match(form.name.left)
                              .with({ _tag: 'MissingE' }, () => 'Enter their name')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                  ${E.isLeft(form.emailAddress)
                    ? html`
                        <li>
                          <a href="#email-address">
                            ${match(form.emailAddress.left)
                              .with({ _tag: 'MissingE' }, () => 'Enter their email address')
                              .with(
                                { _tag: 'InvalidE' },
                                () => 'Enter an email address in the correct format, like name@example.com',
                              )
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <h1>Change ${author.name}’s details</h1>

        <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
          <h2><label for="name">Name</label></h2>

          <p id="name-tip" role="note">They will be able to choose their published name.</p>

          ${E.isLeft(form.name)
            ? html`
                <div class="error-message" id="name-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.name.left)
                    .with({ _tag: 'MissingE' }, () => 'Enter their name')
                    .exhaustive()}
                </div>
              `
            : ''}

          <input
            name="name"
            id="name"
            type="text"
            spellcheck="false"
            aria-describedby="name-tip"
            ${match(form.name)
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .exhaustive()}
            ${E.isLeft(form.name) ? html`aria-invalid="true" aria-errormessage="name-error"` : ''}
          />
        </div>

        <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
          <h2><label for="email-address">Email address</label></h2>

          <p id="email-address-tip" role="note">We’ll only use this to contact them about this PREreview.</p>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.emailAddress.left)
                    .with({ _tag: 'MissingE' }, () => 'Enter their email address')
                    .with(
                      { _tag: 'InvalidE' },
                      () => 'Enter an email address in the correct format, like name@example.com',
                    )
                    .exhaustive()}
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
            aria-describedby="email-address-tip"
            ${match(form.emailAddress)
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
              .exhaustive()}
            ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
          />
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: format(writeReviewChangeAuthorMatch.formatter, { id: preprint.id, number }),
    skipToLabel: 'form',
    js: error ? ['error-summary.js'] : [],
  })
}

export interface ChangeAuthorForm {
  readonly name: E.Either<MissingE, NonEmptyString>
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress>
}
