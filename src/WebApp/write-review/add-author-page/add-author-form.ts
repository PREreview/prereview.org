import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { hasAnError, type InvalidE, type MissingE } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { writeReviewAddAuthorMatch, writeReviewAddAuthorsMatch, writeReviewAuthorsMatch } from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { EmailAddress } from '../../../types/EmailAddress.ts'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import { backNav, prereviewOfSuffix } from '../shared-elements.ts'

export function addAuthorForm({
  form,
  preprint,
  otherAuthors = false,
  locale,
}: {
  form: AddAuthorForm
  preprint: PreprintTitle
  otherAuthors?: boolean
  locale: SupportedLocale
}) {
  const error = hasAnError(form)
  const backMatch = otherAuthors ? writeReviewAddAuthorsMatch : writeReviewAuthorsMatch
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('write-review', 'addAuthor')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(backMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <h1>${t('write-review', 'addAuthor')()}</h1>

        <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
          <h2><label for="name">${t('write-review', 'nameInputLabel')()}</label></h2>

          <p id="name-tip" role="note">${t('write-review', 'theyWillChooseTheirName')()}</p>

          ${E.isLeft(form.name)
            ? html`
                <div class="error-message" id="name-error">
                  <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.name.left, {
                    MissingE: t('write-review', 'enterTheirName'),
                  })}
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
              .with({ right: undefined }, () => '')
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .exhaustive()}
            ${E.isLeft(form.name) ? html`aria-invalid="true" aria-errormessage="name-error"` : ''}
          />
        </div>

        <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
          <h2><label for="email-address">${t('write-review', 'emailAddress')()}</label></h2>

          <p id="email-address-tip" role="note">${t('write-review', 'useOfEmail')()}</p>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.emailAddress.left, {
                    MissingE: t('write-review', 'enterTheirEmail'),
                    InvalidE: t('write-review', 'invalidEmail'),
                  })}
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
              .with({ right: undefined }, () => '')
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
              .exhaustive()}
            ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
          />
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: error ? ['error-summary.js'] : [],
  })
}

export interface AddAuthorForm {
  readonly name: E.Either<MissingE, NonEmptyString | undefined>
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

const toErrorItems = (locale: SupportedLocale) => (form: AddAuthorForm) => html`
  ${E.isLeft(form.name)
    ? html`
        <li>
          <a href="#name">
            ${Match.valueTags(form.name.left, {
              MissingE: translate(locale)('write-review', 'enterTheirName'),
            })}
          </a>
        </li>
      `
    : ''}
  ${E.isLeft(form.emailAddress)
    ? html`
        <li>
          <a href="#email-address">
            ${Match.valueTags(form.emailAddress.left, {
              MissingE: translate(locale)('write-review', 'enterTheirEmail'),
              InvalidE: translate(locale)('write-review', 'invalidEmail'),
            })}
          </a>
        </li>
      `
    : ''}
`
