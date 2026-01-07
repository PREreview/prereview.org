import { Effect } from 'effect'
import * as Comments from '../../../Comments/index.ts'
import * as ContactEmailAddress from '../../../contact-email-address.ts'
import type { Locale } from '../../../Context.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../Routes.ts'

export const VerifyEmailAddress = ({
  commentId,
  token,
}: {
  commentId: Uuid.Uuid
  token: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.FlashMessageResponse | Response.LogInResponse,
  never,
  | Comments.GetNextExpectedCommandForUserOnAComment
  | ContactEmailAddress.GetContactEmailAddress
  | ContactEmailAddress.SaveContactEmailAddress
  | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getContactEmailAddress = yield* ContactEmailAddress.GetContactEmailAddress

    const contactEmailAddress = yield* getContactEmailAddress(user.orcid)

    if (contactEmailAddress._tag === 'VerifiedContactEmailAddress' || contactEmailAddress.verificationToken !== token) {
      return yield* PageNotFound
    }

    const saveContactEmailAddress = yield* ContactEmailAddress.SaveContactEmailAddress

    yield* saveContactEmailAddress(
      user.orcid,
      new ContactEmailAddress.VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
    )

    const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment
    const nextCommand = yield* Effect.flatten(getNextExpectedCommandForUserOnAComment(commentId))

    return Response.FlashMessageResponse({
      location: RouteForCommand(nextCommand).href({ commentId }),
      message: 'contact-email-verified',
    })
  }).pipe(
    Effect.catchTags({
      CommentHasNotBeenStarted: () => HavingProblemsPage,
      CommentIsBeingPublished: () => HavingProblemsPage,
      CommentWasAlreadyPublished: () => HavingProblemsPage,
      ContactEmailAddressIsNotFound: () => PageNotFound,
      ContactEmailAddressIsUnavailable: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterEmailAddress.href({ commentId }) })),
    }),
  )
