import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
  VerifiedContactEmailAddress,
  getContactEmailAddress,
  isUnverified,
  saveContactEmailAddress,
} from '../../contact-email-address.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.ts'
import type { IndeterminatePreprintId } from '../../Preprints/index.ts'
import { FlashMessageResponse, LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { writeReviewMatch, writeReviewVerifyEmailAddressMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { type FormStoreEnv, getForm, nextFormMatch } from './form.ts'

export const writeReviewVerifyEmailAddress = ({
  id,
  locale,
  user,
  verify,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
  verify: Uuid
}): RT.ReaderTask<
  GetContactEmailAddressEnv & GetPreprintTitleEnv & FormStoreEnv & SaveContactEmailAddressEnv,
  PageResponse | RedirectResponse | FlashMessageResponse | LogInResponse
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
          RTE.chainFirstW(({ user, contactEmailAddress }) =>
            saveContactEmailAddress(user.orcid, new VerifiedContactEmailAddress({ value: contactEmailAddress.value })),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with('already-verified', 'invalid-token', 'not-found', () => pageNotFound(locale))
                .with('no-form', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('no-session', () =>
                  LogInResponse({
                    location: format(writeReviewVerifyEmailAddressMatch.formatter, { id: preprint.id, verify }),
                  }),
                )
                .with('form-unavailable', 'unavailable', () => havingProblemsPage(locale))
                .exhaustive(),
            state =>
              FlashMessageResponse({
                message: 'contact-email-verified',
                location: format(nextFormMatch(state.form).formatter, { id: preprint.id }),
              }),
          ),
        ),
    ),
  )
