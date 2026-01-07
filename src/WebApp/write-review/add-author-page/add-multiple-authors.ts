import { identity, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match, P } from 'ts-pattern'
import { hasAnError, type InvalidE, type MissingE } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { writeReviewAddAuthorMatch, writeReviewAddAuthorsMatch, writeReviewAuthorsMatch } from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import { backNav, prereviewOfSuffix } from '../shared-elements.ts'

export function addMultipleAuthorsForm({
  form,
  preprint,
  otherAuthors = false,
  locale,
}: {
  form: AddMultipleAuthorsForm
  preprint: PreprintTitle
  otherAuthors?: boolean
  locale: SupportedLocale
}) {
  const error = hasAnError(form)
  const backMatch = otherAuthors ? writeReviewAddAuthorsMatch : writeReviewAuthorsMatch
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('enterNamesAndEmailAddress')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(backMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(toErrorItems(form, locale), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.authors) ? 'class="error"' : '')}>
          <h1>
            <label for="authors">${t('enterNamesAndEmailAddress')()}</label>
          </h1>

          <p id="authors-tip" role="note">${t('enterNamesAndEmailAddressTip')()}</p>

          <details>
            <summary><span>${t('example')()}</span></summary>

            <div>
              <pre>
Josiah Carberry    carberry@example.com
Minerva McGonagall mcgonagall@example.com
</pre
              >
            </div>
          </details>

          ${E.isLeft(form.authors)
            ? html`
                <div class="error-message" id="authors-error">
                  <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.authors.left, {
                    InvalidE: () => t('namesAndEmailAddressInvalidFormat')(),
                    MissingE: () => t('namesAndEmailAddressMissing')(),
                  })}
                </div>
              `
            : ''}

          <textarea
            name="authors"
            id="authors"
            rows="10"
            spellcheck="false"
            aria-describedby="authors-tip"
            ${E.isLeft(form.authors) ? html`aria-invalid="true" aria-errormessage="authors-error"` : ''}
          >
${match(form.authors)
              .with({ right: P.select(P.string) }, identity)
              .with({ right: undefined }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, identity)
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .exhaustive()}</textarea
          >
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: error ? ['error-summary.js'] : [],
  })
}

export interface AddMultipleAuthorsForm {
  readonly authors: E.Either<InvalidE | MissingE, NonEmptyString | undefined>
}

const toErrorItems = (form: AddMultipleAuthorsForm, locale: SupportedLocale) => html`
  ${E.isLeft(form.authors)
    ? html`
        <li>
          <a href="#authors">
            ${Match.valueTags(form.authors.left, {
              InvalidE: () => translate(locale, 'write-review', 'namesAndEmailAddressInvalidFormat')(),
              MissingE: () => translate(locale, 'write-review', 'namesAndEmailAddressMissing')(),
            })}
          </a>
        </li>
      `
    : ''}
`
