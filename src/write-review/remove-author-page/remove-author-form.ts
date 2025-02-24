import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorsMatch, writeReviewRemoveAuthorMatch } from '../../routes.js'
import type { NonEmptyString } from '../../types/string.js'
import { backNav, errorPrefix, errorSummary, prereviewOfSuffix, saveAndContinueButton } from '../shared-elements.js'

export function removeAuthorForm({
  author,
  form,
  number,
  preprint,
  locale,
}: {
  author: { name: NonEmptyString }
  form: RemoveAuthorForm
  number: number
  preprint: PreprintTitle
  locale: SupportedLocale
}) {
  const error = hasAnError(form)
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: pipe(
      t('write-review', 'removeAuthorTitle')({ authorName: author.name }),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })),
    main: html`
      <form
        method="post"
        action="${format(writeReviewRemoveAuthorMatch.formatter, { id: preprint.id, number })}"
        novalidate
      >
        ${error ? pipe(form, toErrorItems(locale, author.name), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.removeAuthor) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(E.isLeft(form.removeAuthor) ? 'aria-invalid="true" aria-errormessage="remove-author-error"' : '')}
          >
            <legend>
              <h1>${t('write-review', 'sureYouWantToRemove')({ authorName: author.name })}</h1>
            </legend>

            ${E.isLeft(form.removeAuthor)
              ? html`
                  <div class="error-message" id="remove-author-error">
                    <span class="visually-hidden">${t('write-review', 'error')()}</span>
                    ${match(form.removeAuthor.left)
                      .with({ _tag: 'MissingE' }, () =>
                        t('write-review', 'selectYesToRemove')({ authorName: author.name }),
                      )
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
                  <span>${t('write-review', 'yes')()}</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
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

const toErrorItems = (locale: SupportedLocale, authorName: string) => (form: RemoveAuthorForm) => html`
  ${E.isLeft(form.removeAuthor)
    ? html`
        <li>
          <a href="#remove-author-no">
            ${match(form.removeAuthor.left)
              .with({ _tag: 'MissingE' }, () => translate(locale, 'write-review', 'selectYesToRemove')({ authorName }))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
