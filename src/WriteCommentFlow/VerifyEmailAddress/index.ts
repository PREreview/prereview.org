import { Effect } from 'effect'
import * as Comments from '../../Comments/index.js'
import * as ContactEmailAddress from '../../contact-email-address.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { RouteForCommand } from '../Routes.js'

export const VerifyEmailAddress = ({
  commentId,
  token,
}: {
  commentId: Uuid.Uuid
  token: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  | Comments.GetNextExpectedCommandForUserOnAComment
  | ContactEmailAddress.GetContactEmailAddress
  | ContactEmailAddress.SaveContactEmailAddress
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getContactEmailAddress = yield* ContactEmailAddress.GetContactEmailAddress

    const contactEmailAddress = yield* getContactEmailAddress(user.orcid)

    if (contactEmailAddress._tag === 'VerifiedContactEmailAddress' || contactEmailAddress.verificationToken !== token) {
      return pageNotFound
    }

    const saveContactEmailAddress = yield* ContactEmailAddress.SaveContactEmailAddress

    yield* saveContactEmailAddress(
      user.orcid,
      new ContactEmailAddress.VerifiedContactEmailAddress({ value: contactEmailAddress.value }),
    )

    const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment
    const nextCommand = yield* Effect.flatten(getNextExpectedCommandForUserOnAComment(commentId))

    return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
  }).pipe(
    Effect.catchTags({
      CommentHasNotBeenStarted: () => Effect.succeed(havingProblemsPage),
      CommentIsBeingPublished: () => Effect.succeed(havingProblemsPage),
      CommentWasAlreadyPublished: () => Effect.succeed(havingProblemsPage),
      ContactEmailAddressIsNotFound: () => Effect.succeed(pageNotFound),
      ContactEmailAddressIsUnavailable: () => Effect.succeed(havingProblemsPage),
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterEmailAddress.href({ commentId }) })),
    }),
  )
