import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/lib/function.js'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { getContactEmailAddress, isUnverified, saveContactEmailAddress } from '../contact-email-address.js'
import { type OrcidOAuthEnv, logInAndRedirect } from '../log-in/index.js'
import { notFound, seeOther, serviceUnavailable } from '../middleware.js'
import type { TemplatePageEnv } from '../page.js'
import { getPreprintTitle } from '../preprint.js'
import type { PublicUrlEnv } from '../public-url.js'
import { writeReviewMatch, writeReviewVerifyEmailAddressMatch } from '../routes.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import { type GetUserEnv, getUser } from '../user.js'
import { getForm, redirectToNextForm } from './form.js'

export const writeReviewVerifyEmailAddress = (id: IndeterminatePreprintId, verify: Uuid) =>
  pipe(
    RM.fromReaderTaskEither(getPreprintTitle(id)),
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
                GetUserEnv & OrcidOAuthEnv & PublicUrlEnv & TemplatePageEnv,
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
