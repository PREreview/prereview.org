import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { getContactEmailAddress, isUnverified, saveContactEmailAddress } from '../contact-email-address'
import { requiresVerifiedEmailAddress } from '../feature-flags'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { getPreprintTitle } from '../preprint'
import { writeReviewMatch } from '../routes'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import { getUser } from '../user'
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
        RM.ichainMiddlewareKW(({ preprint, form }) => redirectToNextForm(preprint.id)(form)),
        RM.orElseW(error =>
          match(error)
            .with('already-verified', 'invalid-token', 'not-found', () => notFound)
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
