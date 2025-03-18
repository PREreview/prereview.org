import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import { hasAnError, type InvalidE, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorMatch, writeReviewAddAuthorsMatch, writeReviewAuthorsMatch } from '../../routes.js'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../shared-translation-elements.js'
import type { EmailAddress } from '../../types/email-address.js'
import type { NonEmptyString } from '../../types/string.js'
import { backNav, prereviewOfSuffix } from '../shared-elements.js'

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
    status: error ? Status.BadRequest : Status.OK,
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
                  <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                  ${match(form.name.left).with({ _tag: 'MissingE' }, t('write-review', 'enterTheirName')).exhaustive()}
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
                  <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                  ${match(form.emailAddress.left)
                    .with({ _tag: 'MissingE' }, t('write-review', 'enterTheirEmail'))
                    .with({ _tag: 'InvalidE' }, t('write-review', 'invalidEmail'))
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
    js: ['error-summary.js'],
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
            ${match(form.name.left)
              .with({ _tag: 'MissingE' }, translate(locale)('write-review', 'enterTheirName'))
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
              .with({ _tag: 'MissingE' }, translate(locale)('write-review', 'enterTheirEmail'))
              .with({ _tag: 'InvalidE' }, translate(locale)('write-review', 'invalidEmail'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
