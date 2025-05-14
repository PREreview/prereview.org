import { Match, Option, String, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { StatusCodes } from 'http-status-codes'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import {
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
  UnverifiedContactEmailAddress,
  type VerifyContactEmailAddressForReviewEnv,
  maybeGetContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddressForReview,
} from '../contact-email-address.js'
import { type InvalidE, type MissingE, getInput, hasAnError, invalidE, missingE } from '../form.js'
import { html, plainText } from '../html.js'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../preprint.js'
import { type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response.js'
import {
  writeReviewConductMatch,
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { type EmailAddress, EmailAddressC } from '../types/email-address.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import { type GenerateUuidEnv, generateUuid } from '../types/uuid.js'
import type { User } from '../user.js'
import { type FormStoreEnv, getForm, nextFormMatch } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewEnterEmailAddress = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  GenerateUuidEnv &
    GetContactEmailAddressEnv &
    SaveContactEmailAddressEnv &
    VerifyContactEmailAddressForReviewEnv &
    GetPreprintTitleEnv &
    FormStoreEnv,
  PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.bindW('contactEmailAddress', ({ user }) => maybeGetContactEmailAddress(user.orcid)),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', 'unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .with({ contactEmailAddress: { _tag: 'VerifiedContactEmailAddress' } }, state =>
                  RT.of(
                    RedirectResponse({ location: format(nextFormMatch(state.form).formatter, { id: preprint.id }) }),
                  ),
                )
                .with(
                  {
                    contactEmailAddress: P.union({ _tag: 'UnverifiedContactEmailAddress' }, undefined),
                    method: 'POST',
                  },
                  handleEnterEmailAddressForm,
                )
                .with({ contactEmailAddress: P.union({ _tag: 'UnverifiedContactEmailAddress' }, undefined) }, state =>
                  RT.of(showEnterEmailAddressForm(state)),
                )
                .exhaustive(),
          ),
        ),
    ),
  )

const showEnterEmailAddressForm = ({
  contactEmailAddress,
  locale,
  preprint,
}: {
  contactEmailAddress?: UnverifiedContactEmailAddress
  locale: SupportedLocale
  preprint: PreprintTitle
}) => createFormPage(preprint, { emailAddress: E.right(contactEmailAddress?.value) }, locale)

const handleEnterEmailAddressForm = ({
  body,
  locale,
  preprint,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.fromEither(EmailAddressFieldD.decode(body)),
    RTE.mapLeft(error => ({
      emailAddress: match(getInput('emailAddress')(error))
        .returnType<E.Either<MissingE | InvalidE, never>>()
        .with(P.union(P.when(Option.isNone), { value: '' }), () => pipe(missingE(), E.left))
        .with({ value: P.select() }, flow(invalidE, E.left))
        .exhaustive(),
    })),
    RTE.bindTo('value'),
    RTE.apS('verificationToken', RTE.rightReaderIO(generateUuid)),
    RTE.map(({ value, verificationToken }) => new UnverifiedContactEmailAddress({ value, verificationToken })),
    RTE.chainFirstW(contactEmailAddress => saveContactEmailAddress(user.orcid, contactEmailAddress)),
    RTE.chainFirstW(contactEmailAddress => verifyContactEmailAddressForReview(user, contactEmailAddress, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage(locale))
          .with({ emailAddress: P.any }, form => createFormPage(preprint, form, locale))
          .exhaustive(),
      () =>
        RedirectResponse({ location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id }) }),
    ),
  )

const EmailAddressFieldD = pipe(
  D.struct({ emailAddress: pipe(D.string, D.map(String.trim), D.compose(EmailAddressC)) }),
  D.map(Struct.get('emailAddress')),
)

interface EnterEmailAddressForm {
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

function createFormPage(preprint: PreprintTitle, form: EnterEmailAddressForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('contactDetails')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`<a href="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" class="back"
      ><span>${translate(locale, 'forms', 'backLink')()}</span></a
    >`,
    main: html`
      <form
        method="post"
        action="${format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.emailAddress)
                    ? html`
                        <li>
                          <a href="#email-address">
                            ${Match.valueTags(form.emailAddress.left, {
                              MissingE: () => t('enterEmailAddressError')(),
                              InvalidE: () => t('enterEmailAddressFormatError')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <h1>${t('contactDetails')()}</h1>

        <p>${t('confirmEmailAddress')()}</p>

        <p>${t('onlyUseContact')()}</p>

        <div ${error ? html`class="error"` : ''}>
          <h2><label for="email-address">${t('whatIsYourEmail')()}</label></h2>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.emailAddress.left, {
                    MissingE: () => t('enterEmailAddressError')(),
                    InvalidE: () => t('enterEmailAddressFormatError')(),
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
            ${match(form.emailAddress)
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ right: undefined }, () => '')
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
              .exhaustive()}
            ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
          />
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: error ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
