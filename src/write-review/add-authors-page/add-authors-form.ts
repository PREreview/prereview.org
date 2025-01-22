import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import type { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import {
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewChangeAuthorMatch,
  writeReviewRemoveAuthorMatch,
} from '../../routes.js'
import type { EmailAddress } from '../../types/email-address.js'
import type { NonEmptyString } from '../../types/string.js'
import { backNav, errorPrefix, errorSummary } from '../shared-elements.js'

interface AddAuthorsForm {
  readonly anotherAuthor: E.Either<MissingE, 'yes' | 'no' | undefined>
}

export function addAuthorsForm({
  authors,
  form,
  preprint,
  locale,
}: {
  authors: ReadonlyNonEmptyArray<{ name: NonEmptyString; emailAddress: EmailAddress }>
  form: AddAuthorsForm
  preprint: PreprintTitle
  locale: SupportedLocale
}) {
  const error = hasAnError(form)
  const t = translate(locale)
  const visuallyHidden = (s: string) => `<span class="visually-hidden">${s}</span>`
  const authorCount = authors.length

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: pipe(
      t('write-review', 'addAuthorsTitle')({ authorCount, preprintTitle: preprint.title.toString() }),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(writeReviewAuthorsMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <h1>${t('write-review', 'addedAuthorCount')({ authorCount })}</h1>

        ${authors.map(
          (author, index) => html`
            <div class="summary-card">
              <div>
                <h2>${t('write-review', 'authorNumber')({ number: index + 1 })}</h2>

                <a href="${format(writeReviewChangeAuthorMatch.formatter, { id: preprint.id, number: index + 1 })}"
                  >${rawHtml(t('write-review', 'changeAuthorDetailsLink')({ name: author.name, visuallyHidden }))}</a
                >
                <a href="${format(writeReviewRemoveAuthorMatch.formatter, { id: preprint.id, number: index + 1 })}"
                  >${rawHtml(t('write-review', 'removeAuthor')({ name: author.name, visuallyHidden }))}</a
                >
              </div>

              <dl class="summary-list">
                <div>
                  <dt><span>${t('write-review', 'name')()}</span></dt>
                  <dd>${author.name}</dd>
                </div>
                <div>
                  <dt><span>${t('write-review', 'emailAddress')()}</span></dt>
                  <dd>${author.emailAddress}</dd>
                </div>
              </dl>
            </div>
          `,
        )}

        <div ${rawHtml(E.isLeft(form.anotherAuthor) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(
              E.isLeft(form.anotherAuthor) ? 'aria-invalid="true" aria-errormessage="another-author-error"' : '',
            )}
          >
            <legend><h2>${t('write-review', 'needToAddAuthor')()}</h2></legend>

            ${E.isLeft(form.anotherAuthor)
              ? html`
                  <div class="error-message" id="another-author-error">
                    <span class="visually-hidden">${t('write-review', 'error')()}</span>
                    ${match(form.anotherAuthor.left)
                      .with({ _tag: 'MissingE' }, t('write-review', 'yesIfAnotherAuthor'))
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
                  <span>${t('write-review', 'no')()}</span>
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
                  <span>${t('write-review', 'yes')()}</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${t('write-review', 'continueButton')()}</button>
      </form>
    `,
    canonical: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: ['error-summary.js'],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: AddAuthorsForm) => html`
  ${E.isLeft(form.anotherAuthor)
    ? html`
        <li>
          <a href="#another-author-no">
            ${match(form.anotherAuthor.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'yesIfAnotherAuthor'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
