import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../form.ts'
import { html, plainText, rawHtml } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { PreprintTitle } from '../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import { writeReviewAddAuthorsMatch, writeReviewRemoveAuthorMatch } from '../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../shared-translation-elements.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { backNav, prereviewOfSuffix } from '../shared-elements.ts'

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
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('write-review', 'sureYouWantToRemove')({ authorName: author.name }),
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
                    <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.removeAuthor.left, {
                      MissingE: () => t('write-review', 'selectYesToRemove')({ authorName: author.name }),
                    })}
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
                  <span>${t('write-review', 'no')()}</span>
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
                  <span>${t('write-review', 'yesRemove')({ authorName: author.name })}</span>
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
            ${Match.valueTags(form.removeAuthor.left, {
              MissingE: () => translate(locale, 'write-review', 'selectYesToRemove')({ authorName }),
            })}
          </a>
        </li>
      `
    : ''}
`
