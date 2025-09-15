import { pipe, type Array } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../Preprints/index.js'
import { StreamlinePageResponse } from '../../response.js'
import {
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewChangeAuthorMatch,
  writeReviewRemoveAuthorMatch,
} from '../../routes.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { EmailAddress } from '../../types/EmailAddress.js'
import type { NonEmptyString } from '../../types/NonEmptyString.js'
import { backNav, prereviewOfSuffix } from '../shared-elements.js'

export function addAuthorsForm({
  authors,
  preprint,
  locale,
}: {
  authors: Array.NonEmptyReadonlyArray<{ name: NonEmptyString; emailAddress: EmailAddress }>
  preprint: PreprintTitle
  locale: SupportedLocale
}) {
  const t = translate(locale)
  const visuallyHidden = (s: string) => `<span class="visually-hidden">${s}</span>`
  const authorCount = authors.length

  return StreamlinePageResponse({
    status: StatusCodes.OK,
    title: pipe(
      t('write-review', 'addedAuthorCount')({ authorCount }),
      prereviewOfSuffix(locale, preprint.title),
      plainText,
    ),
    nav: backNav(locale, format(writeReviewAuthorsMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
        <h1>${t('write-review', 'addedAuthorCount')({ authorCount })}</h1>

        ${authors.map(
          (author, index) => html`
            <div class="summary-card">
              <div>
                <h2>${t('write-review', 'authorNumber')({ number: index + 1 })}</h2>

                <ul>
                  <li>
                    <a href="${format(writeReviewChangeAuthorMatch.formatter, { id: preprint.id, number: index + 1 })}"
                      >${rawHtml(
                        t('write-review', 'changeAuthorDetailsLink')({ name: author.name, visuallyHidden }),
                      )}</a
                    >
                  </li>
                  <li>
                    <a href="${format(writeReviewRemoveAuthorMatch.formatter, { id: preprint.id, number: index + 1 })}"
                      >${rawHtml(t('write-review', 'removeAuthor')({ name: author.name, visuallyHidden }))}</a
                    >
                  </li>
                </ul>
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

        <div class="button-group" role="group">
          <button>${t('forms', 'continueButton')()}</button>
          <a href="${format(writeReviewAddAuthorMatch.formatter, { id: preprint.id })}"
            >${t('write-review', 'addAnotherAuthor')()}</a
          >
        </div>
      </form>
    `,
    canonical: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }),
    skipToLabel: 'main',
  })
}
