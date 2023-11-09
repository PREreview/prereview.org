import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { IO } from 'fp-ts/IO'
import * as O from 'fp-ts/Option'
import * as RIO from 'fp-ts/ReaderIO'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type UnverifiedContactEmailAddress,
  maybeGetContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddress,
} from '../contact-email-address'
import { requiresVerifiedEmailAddress } from '../feature-flags'
import { type InvalidE, type MissingE, getInput, hasAnError, invalidE, missingE } from '../form'
import { html, plainText, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewConductMatch,
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewVerifyEmailAddressMatch,
} from '../routes'
import { EmailAddressC } from '../types/email-address'
import { type User, getUser } from '../user'
import { getForm, redirectToNextForm } from './form'

interface GenerateUuidEnv {
  generateUuid: IO<Uuid>
}

const generateUuid = pipe(
  RIO.ask<GenerateUuidEnv>(),
  RIO.chainIOK(({ generateUuid }) => generateUuid),
)

export const writeReviewEnterEmailAddress = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'requiresVerifiedEmailAddress',
        flow(
          RM.fromReaderK(({ user }) => requiresVerifiedEmailAddress(user)),
          RM.filterOrElse(
            requiresVerifiedEmailAddress => requiresVerifiedEmailAddress,
            () => 'not-found' as const,
          ),
        ),
      ),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.bindW(
        'contactEmailAddress',
        RM.fromReaderTaskEitherK(({ user }) => maybeGetContactEmailAddress(user.orcid)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with({ contactEmailAddress: { type: 'verified' } }, state =>
            RM.fromMiddleware(redirectToNextForm(preprint.id)(state.form)),
          )
          .with({ contactEmailAddress: { type: 'unverified' } }, () =>
            RM.fromMiddleware(seeOther(format(writeReviewVerifyEmailAddressMatch.formatter, { id: preprint.id }))),
          )
          .with({ contactEmailAddress: undefined, method: 'POST' }, handleEnterEmailAddressForm)
          .with({ contactEmailAddress: undefined }, showEnterEmailAddressForm)
          .exhaustive(),
      ),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => notFound)
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
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showEnterEmailAddressForm = ({ preprint, user }: { preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.rightReader(createFormPage(preprint, user, { emailAddress: E.right(undefined) })),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showEnterEmailAddressErrorForm = ({ preprint, user }: { preprint: PreprintTitle; user: User }) =>
  flow(
    RM.fromReaderK((form: EnterEmailAddressForm) => createFormPage(preprint, user, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleEnterEmailAddressForm = ({ preprint, user }: { preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(E.right),
    RM.chainEitherK(
      flow(
        EmailAddressFieldD.decode,
        E.mapLeft(error => ({
          emailAddress: match(getInput('emailAddress')(error))
            .returnType<E.Either<MissingE | InvalidE, never>>()
            .with(P.union(P.when(O.isNone), { value: '' }), () => pipe(missingE(), E.left))
            .with({ value: P.select() }, flow(invalidE, E.left))
            .exhaustive(),
        })),
      ),
    ),
    RM.ichainW(emailAddress =>
      pipe(
        RM.fromReaderIO(generateUuid),
        RM.map(
          verificationToken =>
            ({
              type: 'unverified',
              value: emailAddress,
              verificationToken,
            }) satisfies UnverifiedContactEmailAddress,
        ),
        RM.chainFirstReaderTaskEitherKW(contactEmailAddress =>
          saveContactEmailAddress(user.orcid, contactEmailAddress),
        ),
        RM.chainFirstReaderTaskEitherKW(contactEmailAddress => verifyContactEmailAddress(user, contactEmailAddress)),
        RM.ichainMiddlewareK(() => seeOther(format(writeReviewVerifyEmailAddressMatch.formatter, { id: preprint.id }))),
        RM.orElseW(() => serviceUnavailable),
      ),
    ),
    RM.orElseW(showEnterEmailAddressErrorForm({ preprint, user })),
  )

const EmailAddressFieldD = pipe(
  D.struct({ emailAddress: pipe(D.string, D.map(s.trim), D.compose(EmailAddressC)) }),
  D.map(get('emailAddress')),
)

interface EnterEmailAddressForm {
  readonly emailAddress: E.Either<MissingE | InvalidE, undefined>
}

function createFormPage(preprint: PreprintTitle, user: User, form: EnterEmailAddressForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}What is your email address? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.emailAddress)
                      ? html`
                          <li>
                            <a href="#email-address">
                              ${match(form.emailAddress.left)
                                .with({ _tag: 'MissingE' }, () => 'Enter your email address')
                                .with(
                                  { _tag: 'InvalidE' },
                                  () => 'Enter an email address in the correct format, like name@example.com',
                                )
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${error ? html`class="error"` : ''}>
            <h1><label for="email-address">What is your email address?</label></h1>

            <p id="email-address-tip" role="note">
              We’ll only use this to contact you about your account and PREreviews.
            </p>

            ${E.isLeft(form.emailAddress)
              ? html`
                  <div class="error-message" id="email-address-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.emailAddress.left)
                      .with({ _tag: 'MissingE' }, () => 'Enter your email address')
                      .with(
                        { _tag: 'InvalidE' },
                        () => 'Enter an email address in the correct format, like name@example.com',
                      )
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
                .with({ right: undefined }, () => '')
                .with({ left: { _tag: 'MissingE' } }, () => '')
                .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
                .exhaustive()}
              ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
            />
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: error ? ['error-summary.js'] : [],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}
