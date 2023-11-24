import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { getContactEmailAddress, isUnverified, saveContactEmailAddress } from '../contact-email-address'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { FlashMessageResponse, LogInResponse } from '../response'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../routes'
import type { User } from '../user'

export type Env = EnvFor<ReturnType<typeof verifyContactEmailAddress>>

export const verifyContactEmailAddress = ({ verify, user }: { verify: Uuid; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW(
      'contactEmailAddress',
      flow(
        ({ user }) => getContactEmailAddress(user.orcid),
        RTE.filterOrElseW(isUnverified, () => 'already-verified' as const),
        RTE.filterOrElseW(
          contactEmailAddress => contactEmailAddress.verificationToken === verify,
          () => 'invalid-token' as const,
        ),
      ),
    ),
    RTE.chainW(({ user, contactEmailAddress }) =>
      saveContactEmailAddress(user.orcid, {
        type: 'verified',
        value: contactEmailAddress.value,
      }),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('already-verified', 'not-found', 'invalid-token', () => pageNotFound)
          .with('no-session', () =>
            LogInResponse({ location: format(verifyContactEmailAddressMatch.formatter, { verify }) }),
          )
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () =>
        FlashMessageResponse({
          location: format(myDetailsMatch.formatter, {}),
          message: 'contact-email-verified',
        }),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
