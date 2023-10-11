import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { deleteEmailAddress, getEmailAddress, saveEmailAddress } from '../email-address'
import { canChangeEmailAddress } from '../feature-flags'
import { html, plainText, sendHtml } from '../html'
import { logInAndRedirect } from '../log-in'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { changeEmailAddressMatch, myDetailsMatch } from '../routes'
import { type NonEmptyString, NonEmptyStringC } from '../string'
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
    RM.map(O.some),
    RM.orElseW(() => RM.of(O.none)),
    RM.chainReaderKW(emailAddress => createFormPage(user, emailAddress)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )

const ChangeEmailAddressFormD = pipe(D.struct({ emailAddress: NonEmptyStringC }))

const handleChangeEmailAddressForm = (user: User) =>
  pipe(
    RM.decodeBody(body => ChangeEmailAddressFormD.decode(body)),
    RM.orElseW(() => RM.of({ emailAddress: undefined })),
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
  )

function createFormPage(user: User, emailAddress: O.Option<NonEmptyString>) {
  return page({
    title: plainText`What is your email address?`,
    content: html`
      <nav>
        <a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(changeEmailAddressMatch.formatter, {})}" novalidate>
          <h1><label for="email-address">What is your email address?</label></h1>

          <input
            name="emailAddress"
            id="email-address"
            type="text"
            ${match(emailAddress)
              .with({ value: P.select() }, emailAddress => html`value="${emailAddress}"`)
              .when(O.isNone, () => '')
              .exhaustive()}
          />

          <button>Save and continue</button>
        </form>
      </main>
    `,
    skipLinks: [[html`Skip to form`, '#form']],
    user,
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
