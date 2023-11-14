import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { getContactEmailAddress, isUnverified, saveContactEmailAddress } from '../contact-email-address'
import { requiresVerifiedEmailAddress } from '../feature-flags'
import { logInAndRedirect } from '../log-in'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import type { FathomEnv, PhaseEnv } from '../page'
import { getPreprintTitle } from '../preprint'
import type { PublicUrlEnv } from '../public-url'
import { writeReviewMatch, writeReviewVerifyEmailAddressMatch } from '../routes'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import { type GetUserEnv, getUser } from '../user'
import { getForm, redirectToNextForm } from './form'

export const writeReviewVerifyEmailAddress = (id: IndeterminatePreprintId, verify: Uuid) =>
  pipe(
    RM.fromReaderTaskEither(getPreprintTitle(id)),
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
          flow(
            RM.fromReaderTaskEitherK(({ user }) => getContactEmailAddress(user.orcid)),
            RM.filterOrElseW(isUnverified, () => 'already-verified' as const),
            RM.filterOrElseW(
              contactEmailAddress => contactEmailAddress.verificationToken === verify,
              () => 'invalid-token' as const,
            ),
          ),
        ),
        RM.chainFirstReaderTaskEitherKW(({ user, contactEmailAddress }) =>
          saveContactEmailAddress(user.orcid, {
            type: 'verified',
            value: contactEmailAddress.value,
          }),
        ),
        RM.ichainMiddlewareKW(({ preprint, form }) => redirectToNextForm(preprint.id, 'contact-email-verified')(form)),
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
            .with('already-verified', 'invalid-token', 'not-found', () => notFound)
            .with(
              'no-form',
              RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
            )
            .with('no-session', () =>
              logInAndRedirect(writeReviewVerifyEmailAddressMatch.formatter, { id: preprint.id, verify }),
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
