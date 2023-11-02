import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { getContactEmailAddress, saveContactEmailAddress } from '../contact-email-address'
import { canChangeContactEmailAddress } from '../feature-flags'
import { logInAndRedirect } from '../log-in'
import { notFound, serviceUnavailable } from '../middleware'
import type { FathomEnv, PhaseEnv } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../routes'
import { type GetUserEnv, getUser } from '../user'

export type Env = EnvFor<typeof verifyContactEmailAddress>

export const verifyContactEmailAddress = pipe(
  getUser,
  RM.bindTo('user'),
  RM.bindW(
    'canChangeContactEmailAddress',
    flow(
      RM.fromReaderK(({ user }) => canChangeContactEmailAddress(user)),
      RM.filterOrElse(
        canChangeContactEmailAddress => canChangeContactEmailAddress,
        () => 'not-found' as const,
      ),
    ),
  ),
  RM.bindW(
    'contactEmailAddress',
    flow(
      RM.fromReaderTaskEitherK(({ user }) => getContactEmailAddress(user.orcid)),
      RM.filterOrElseW(
        contactEmailAddress => contactEmailAddress.type === 'unverified',
        () => 'already-verified' as const,
      ),
    ),
  ),
  RM.chainReaderTaskEitherKW(({ user, contactEmailAddress }) =>
    saveContactEmailAddress(user.orcid, {
      type: 'verified',
      value: contactEmailAddress.value,
    }),
  ),
  RM.ichain(() => RM.status(Status.SeeOther)),
  RM.ichain(() => RM.header('Location', format(myDetailsMatch.formatter, {}))),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
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
      .with('already-verified', 'not-found', () => notFound)
      .with('no-session', () => logInAndRedirect(verifyContactEmailAddressMatch.formatter, {}))
      .with(P.instanceOf(Error), 'unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
