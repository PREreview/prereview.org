import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import type { CloudinaryAvatars } from '../../../ExternalInteractions/index.ts'
import { Avatars } from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { FlashMessageResponse, RedirectResponse, type Response } from '../../Response/index.ts'
import { RemoveAvatarPage as CreatePage } from './RemoveAvatarPage.ts'

export const RemoveAvatarPage: Effect.Effect<
  Response,
  never,
  Avatars.Store | CloudinaryAvatars.CloudinaryAvatars | Locale | LoggedInUser
> = Effect.gen(function* () {
  const locale = yield* Locale
  const user = yield* LoggedInUser

  yield* Avatars.get(user.orcid)

  return CreatePage(locale)
}).pipe(
  Effect.catchTags({
    AvatarNotFound: () => Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    AvatarUnavailable: () => HavingProblemsPage,
  }),
  Effect.withSpan('MyDetails.RemoveAvatarPage'),
)

export const RemoveAvatarSubmission: Effect.Effect<
  Response,
  never,
  Avatars.Store | CloudinaryAvatars.CloudinaryAvatars | Locale | LoggedInUser
> = Effect.gen(function* () {
  const user = yield* LoggedInUser

  yield* Avatars.get(user.orcid)

  yield* Avatars.remove(user.orcid)

  return FlashMessageResponse({ location: format(Routes.myDetailsMatch.formatter, {}), message: 'avatar-removed' })
}).pipe(
  Effect.catchTags({
    AvatarNotFound: () => Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    AvatarUnavailable: () => HavingProblemsPage,
  }),
  Effect.withSpan('MyDetails.RemoveAvatarSubmission'),
)
