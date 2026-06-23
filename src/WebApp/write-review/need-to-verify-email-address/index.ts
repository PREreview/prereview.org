import { Effect, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { ContactEmailAddresses } from '../../../ContactEmailAddresses/index.ts'
import type { Locale } from '../../../Context.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
  writeReviewPublishMatch,
} from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import {
  FlashMessageResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import { type FormStoreEnv, getForm, nextFormMatch } from '../form.ts'
import { needToVerifyEmailAddressMessage } from './need-to-verify-email-address-message.ts'

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
  EffectToFpts.EffectEnv<ContactEmailAddresses | Locale> & GetPreprintTitleEnv & FormStoreEnv,
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
          RTE.bindW(
            'contactEmailAddress',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(
                function* ({ user }) {
                  const contactEmailAddresses = yield* ContactEmailAddresses
                  return yield* contactEmailAddresses.getContactEmailAddress(user.orcid)
                },
                Effect.catchTag('ContactEmailAddressIsNotFound', () => Effect.succeed(undefined)),
              ),
            ),
          ),
          RTE.let('method', () => method),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', { _tag: 'ContactEmailAddressIsUnavailable' }, () =>
                    havingProblemsPage(locale),
                  )
                  .exhaustive(),
              ),
            state =>
              match(state)
                .returnType<
                  RT.ReaderTask<
                    EffectToFpts.EffectEnv<ContactEmailAddresses | Locale>,
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
                  EffectToFpts.toReaderTaskK(resendVerificationEmail),
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

const resendVerificationEmail = Effect.fnUntraced(
  function* ({ preprint, user }: { preprint: PreprintTitle; user: User }) {
    const contactEmailAddresses = yield* ContactEmailAddresses

    yield* contactEmailAddresses.resendVerificationEmail({
      orcidId: user.orcid,
      resumeAt: format(writeReviewPublishMatch.formatter, { id: preprint.id }) as `/${string}`,
    })

    return FlashMessageResponse({
      message: 'verify-contact-email-resend',
      location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id }),
    })
  },
  (result, { preprint }) =>
    Effect.catchTags(result, {
      ContactEmailAddressIsNotFound: () => PageNotFound,
      ContactEmailAddressIsUnavailable: () => HavingProblemsPage,
      ContactEmailAddressHasAlreadyBeenVerified: () =>
        Effect.succeed(RedirectResponse({ location: format(writeReviewPublishMatch.formatter, { id: preprint.id }) })),
    }),
)
