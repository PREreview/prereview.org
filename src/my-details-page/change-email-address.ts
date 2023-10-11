import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as I from 'fp-ts/Identity'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import {
  type EmailAddress,
  EmailAddressC,
  deleteEmailAddress,
  getEmailAddress,
  saveEmailAddress,
} from '../email-address'
import { canChangeEmailAddress } from '../feature-flags'
import { type InvalidE, getInput, hasAnError, invalidE } from '../form'
import { html, plainText, sendHtml } from '../html'
import { logInAndRedirect } from '../log-in'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { changeEmailAddressMatch, myDetailsMatch } from '../routes'
import { type GetUserEnv, type User, getUser } from '../user'

export type Env = EnvFor<typeof changeEmailAddress>

export const changeEmailAddress = pipe(
  RM.rightReader(canChangeEmailAddress),
  RM.filterOrElse(
    canChangeEmailAddress => canChangeEmailAddress,
    () => 'not-found' as const,
  ),
  RM.chainW(() => getUser),
  RM.bindTo('user'),
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.ichainW(state =>
    match(state.method)
      .with('POST', () => handleChangeEmailAddressForm(state.user))
      .otherwise(() => showChangeEmailAddressForm(state.user)),
  ),
  RM.orElseW(error =>
    match(error)
      .returnType<
        RM.ReaderMiddleware<
          FathomEnv & GetUserEnv & OAuthEnv & PhaseEnv & PublicUrlEnv,
          StatusOpen,
          ResponseEnded,
          never,
          void
        >
      >()
      .with('not-found', () => notFound)
      .with('no-session', () => logInAndRedirect(myDetailsMatch.formatter, {}))
      .with(P.instanceOf(Error), () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showChangeEmailAddressForm = (user: User) =>
  pipe(
    RM.fromReaderTaskEither(getEmailAddress(user.orcid)),
    RM.orElseW(() => RM.of(undefined)),
    RM.chainReaderKW(emailAddress => createFormPage(user, { emailAddress: E.right(emailAddress) })),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showChangeEmailAddressErrorForm = (user: User) =>
  flow(
    RM.fromReaderK((form: ChangeEmailAddressForm) => createFormPage(user, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleChangeEmailAddressForm = (user: User) =>
  pipe(
    RM.decodeBody(E.right),
    RM.map(body =>
      pipe(
        I.Do,
        I.let('emailAddress', () =>
          pipe(
            EmailAddressFieldD.decode(body),
            E.orElseW(error =>
              match(getInput('emailAddress')(error))
                .with({ value: P.select() }, flow(invalidE, E.left))
                .when(O.isNone, () => E.right(undefined))
                .exhaustive(),
            ),
          ),
        ),
      ),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('emailAddress', fields.emailAddress),
        E.mapLeft(() => fields),
      ),
    ),
    RM.ichainW(({ emailAddress }) =>
      match(emailAddress)
        .with(P.string, emailAddress =>
          pipe(
            RM.fromReaderTaskEither(saveEmailAddress(user.orcid, emailAddress)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
            RM.orElseW(() => serviceUnavailable),
          ),
        )
        .with(undefined, () =>
          pipe(
            RM.fromReaderTaskEither(deleteEmailAddress(user.orcid)),
            RM.ichainMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
            RM.orElseW(() => serviceUnavailable),
          ),
        )
        .exhaustive(),
    ),
    RM.orElseW(showChangeEmailAddressErrorForm(user)),
  )

const EmailAddressFieldD = pipe(
  D.struct({
    emailAddress: pipe(
      D.string,
      D.map(s.trim),
      D.compose(
        D.union(
          EmailAddressC,
          pipe(
            D.literal(''),
            D.map(() => undefined),
          ),
        ),
      ),
    ),
  }),
  D.map(get('emailAddress')),
)

interface ChangeEmailAddressForm {
  readonly emailAddress: E.Either<InvalidE, EmailAddress | undefined>
}

function createFormPage(user: User, form: ChangeEmailAddressForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}What is your email address?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeEmailAddressMatch.formatter, {})}" novalidate>
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

            ${E.isLeft(form.emailAddress)
              ? html`
                  <div class="error-message" id="email-address-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.emailAddress.left)
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
              ${match(form.emailAddress)
                .with({ right: undefined }, () => '')
                .with({ right: P.select(P.string) }, value => html`value="${value}"`)
                .with({ left: { actual: P.select() } }, value => html`value="${value}"`)
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
    user,
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
