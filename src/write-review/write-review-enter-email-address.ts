import { Match, Option, String, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { StatusCodes } from 'http-status-codes'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import {
  UnverifiedContactEmailAddress,
  maybeGetContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddressForReview,
} from '../contact-email-address.js'
import { type InvalidE, type MissingE, getInput, hasAnError, invalidE, missingE } from '../form.js'
import { html, plainText } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import { StreamlinePageResponse, handlePageResponse } from '../response.js'
import {
  writeReviewConductMatch,
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { type EmailAddress, EmailAddressC } from '../types/email-address.js'
import { generateUuid } from '../types/uuid.js'
import { type User, getUser } from '../user.js'
import { getForm, redirectToNextForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewEnterEmailAddress = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.bindW(
        'contactEmailAddress',
        RM.fromReaderTaskEitherK(({ user }) => maybeGetContactEmailAddress(user.orcid)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.apSW(
        'locale',
        RM.asks((env: { locale: SupportedLocale }) => env.locale),
      ),
      RM.ichainW(state =>
        match(state)
          .with({ contactEmailAddress: { _tag: 'VerifiedContactEmailAddress' } }, state =>
            RM.fromMiddleware(redirectToNextForm(preprint.id)(state.form)),
          )
          .with(
            { contactEmailAddress: P.union({ _tag: 'UnverifiedContactEmailAddress' }, undefined), method: 'POST' },
            handleEnterEmailAddressForm,
          )
          .with(
            { contactEmailAddress: P.union({ _tag: 'UnverifiedContactEmailAddress' }, undefined) },
            showEnterEmailAddressForm,
          )
          .exhaustive(),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('unavailable', 'form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(
    Match.valueTags({
      PreprintIsNotFound: () => notFound,
      PreprintIsUnavailable: () => serviceUnavailable,
    }),
  ),
)

const showEnterEmailAddressForm = ({
  contactEmailAddress,
  locale,
  preprint,
  user,
}: {
  contactEmailAddress?: UnverifiedContactEmailAddress
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(createFormPage(preprint, { emailAddress: E.right(contactEmailAddress?.value) }, locale))),
    RM.ichainW(handlePageResponse),
  )

const showEnterEmailAddressErrorForm = ({
  form,
  locale,
  preprint,
  user,
}: {
  form: EnterEmailAddressForm
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(createFormPage(preprint, form, locale))),
    RM.ichainW(handlePageResponse),
  )

const handleEnterEmailAddressForm = ({
  locale,
  preprint,
  user,
}: {
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.decodeBody(E.right),
    RM.chainEitherK(
      flow(
        EmailAddressFieldD.decode,
        E.mapLeft(error => ({
          emailAddress: match(getInput('emailAddress')(error))
            .returnType<E.Either<MissingE | InvalidE, never>>()
            .with(P.union(P.when(Option.isNone), { value: '' }), () => pipe(missingE(), E.left))
            .with({ value: P.select() }, flow(invalidE, E.left))
            .exhaustive(),
        })),
      ),
    ),
    RM.ichainW(emailAddress =>
      pipe(
        RM.fromReaderIO(generateUuid),
        RM.map(verificationToken => new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken })),
        RM.chainFirstReaderTaskEitherKW(contactEmailAddress =>
          saveContactEmailAddress(user.orcid, contactEmailAddress),
        ),
        RM.chainFirstReaderTaskEitherKW(contactEmailAddress =>
          verifyContactEmailAddressForReview(user, contactEmailAddress, preprint.id),
        ),
        RM.ichainMiddlewareK(() =>
          seeOther(format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id })),
        ),
        RM.orElseW(() => serviceUnavailable),
      ),
    ),
    RM.orElseW(form => showEnterEmailAddressErrorForm({ form, locale, preprint, user })),
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
