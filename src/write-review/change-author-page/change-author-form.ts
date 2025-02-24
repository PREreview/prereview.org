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
import { writeReviewAddAuthorsMatch, writeReviewChangeAuthorMatch } from '../../routes.js'
import type { EmailAddress } from '../../types/email-address.js'
import type { NonEmptyString } from '../../types/string.js'
import { backNav, errorPrefix, errorSummary, prereviewOfSuffix, saveAndContinueButton } from '../shared-elements.js'

export function changeAuthorForm({
  author,
  form,
  number,
  preprint,
  locale,
}: {
  author: { name: NonEmptyString }
  form: ChangeAuthorForm
  number: number
  preprint: PreprintTitle
  locale: SupportedLocale
}) {
  const error = hasAnError(form)
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: pipe(
      t('write-review', 'changeAuthorDetailsHeading')({ name: author.name }),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })),
    main: html`
      <form
        method="post"
        action="${format(writeReviewChangeAuthorMatch.formatter, { id: preprint.id, number })}"
        novalidate
      >
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <h1>${t('write-review', 'changeAuthorDetailsHeading')({ name: author.name })}</h1>

        <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
          <h2><label for="name">${t('write-review', 'name')()}</label></h2>

          <p id="name-tip" role="note">${t('write-review', 'ableToChoseName')()}</p>

          ${E.isLeft(form.name)
            ? html`
                <div class="error-message" id="name-error">
                  <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                  ${match(form.name.left).with({ _tag: 'MissingE' }, t('write-review', 'enterName')).exhaustive()}
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
          <h2><label for="email-address">${t('write-review', 'emailAddress')()}</label></h2>

          <p id="email-address-tip" role="note">${t('write-review', 'useOfEmail')()}</p>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                  ${match(form.emailAddress.left)
                    .with({ _tag: 'MissingE' }, t('write-review', 'enterEmail'))
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
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
              .exhaustive()}
            ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
          />
        </div>

        ${saveAndContinueButton(locale)}
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

const toErrorItems = (locale: SupportedLocale) => (form: ChangeAuthorForm) => html`
  ${E.isLeft(form.name)
    ? html`
        <li>
          <a href="#name">
            ${match(form.name.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'enterName'))
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
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'enterEmail'))
              .with({ _tag: 'InvalidE' }, translate(locale, 'write-review', 'invalidEmail'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
