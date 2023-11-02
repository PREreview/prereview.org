import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { getContactEmailAddress, isUnverified, saveContactEmailAddress } from '../contact-email-address'
import { canChangeContactEmailAddress } from '../feature-flags'
import { setFlashMessage } from '../flash-message'
import { logInAndRedirect } from '../log-in'
import { notFound, serviceUnavailable } from '../middleware'
import type { FathomEnv, PhaseEnv } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../routes'
import { type EmailAddress, eqEmailAddress } from '../types/email-address'
import { type GetUserEnv, getUser } from '../user'

export type Env = EnvFor<ReturnType<typeof verifyContactEmailAddress>>

export const verifyContactEmailAddress = (verify: EmailAddress) =>
  pipe(
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
        RM.filterOrElseW(isUnverified, () => 'already-verified' as const),
        RM.filterOrElseW(
          contactEmailAddress => eqEmailAddress.equals(contactEmailAddress.value, verify),
          () => 'wrong-email-address' as const,
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
    RM.ichainMiddlewareKW(() => setFlashMessage('contact-email-verified')),
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
        .with('already-verified', 'not-found', 'wrong-email-address', () => notFound)
        .with('no-session', () => logInAndRedirect(verifyContactEmailAddressMatch.formatter, { verify }))
        .with(P.instanceOf(Error), 'unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
