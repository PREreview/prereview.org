import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import {
  type GetContactEmailAddressEnv,
  type UnverifiedContactEmailAddress,
  type VerifyContactEmailAddressForReviewEnv,
  maybeGetContactEmailAddress,
  verifyContactEmailAddressForReview,
} from '../../contact-email-address.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.js'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.js'
import {
  FlashMessageResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../response.js'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../../routes.js'
import type { User } from '../../user.js'
import { type FormStoreEnv, getForm, nextFormMatch } from '../form.js'
import { needToVerifyEmailAddressMessage } from './need-to-verify-email-address-message.js'

export const writeReviewNeedToVerifyEmailAddress = ({
  id,
  locale,
  method,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  GetContactEmailAddressEnv & GetPreprintTitleEnv & FormStoreEnv & VerifyContactEmailAddressForReviewEnv,
  PageResponse | RedirectResponse | FlashMessageResponse | StreamlinePageResponse
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.bindW('contactEmailAddress', ({ user }) => maybeGetContactEmailAddress(user.orcid)),
          RTE.let('method', () => method),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', 'unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .returnType<
                  RT.ReaderTask<
                    VerifyContactEmailAddressForReviewEnv,
                    PageResponse | RedirectResponse | FlashMessageResponse | StreamlinePageResponse
                  >
                >()
                .with({ contactEmailAddress: { _tag: 'VerifiedContactEmailAddress' } }, state =>
                  RT.of(
                    RedirectResponse({ location: format(nextFormMatch(state.form).formatter, { id: preprint.id }) }),
                  ),
                )
                .with(
                  { contactEmailAddress: { _tag: 'UnverifiedContactEmailAddress' }, method: 'POST' },
                  resendVerificationEmail,
                )
                .with({ contactEmailAddress: { _tag: 'UnverifiedContactEmailAddress' } }, state =>
                  RT.of(needToVerifyEmailAddressMessage(state)),
                )
                .with({ contactEmailAddress: undefined }, () =>
                  RT.of(
                    RedirectResponse({
                      location: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id }),
                    }),
                  ),
                )
                .exhaustive(),
          ),
        ),
    ),
  )

const resendVerificationEmail = ({
  contactEmailAddress,
  locale,
  preprint,
  user,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    verifyContactEmailAddressForReview(user, contactEmailAddress, preprint.id),
    RTE.matchW(
      () => havingProblemsPage(locale),
      () =>
        FlashMessageResponse({
          message: 'verify-contact-email-resend',
          location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id }),
        }),
    ),
  )
