import { Effect } from 'effect'
import { AuthorInvites } from '../../../Domain/AuthorInvites/index.ts'
import type { Locale } from '../../../Context.ts'
import * as Routes from '../../../routes.ts'
import { Temporal } from '../../../types/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { NoPermissionPage } from '../../NoPermissionPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { type Response, RedirectResponse } from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'

export const AcceptInvite: (input: {
  invitationId: Uuid
}) => Effect.Effect<Response, never, AuthorInvites | LoggedInUser | Locale> = Effect.fn(
  'AuthorInviteFlow.AcceptInvite',
)(
  function* ({ invitationId }) {
    const authorInvites = yield* AuthorInvites
    const user = yield* LoggedInUser
    const acceptedAt = yield* Temporal.currentInstant

    yield* authorInvites.acceptInvite({ invitationId, orcidId: user.orcid, acceptedAt })

    const reviewId = yield* authorInvites.getReviewIdForInvitation(invitationId)

    const nextExpectedCommand = yield* authorInvites.getNextExpectedCommandForAPrereviewerOnAReview({
      reviewId,
      orcidId: user.orcid,
    })

    return RedirectResponse({ location: RouteForCommand(nextExpectedCommand).href({ reviewId }) })
  },
  (effect, { invitationId }) =>
    Effect.catchTags(effect, {
      InvitationNotFound: () => PageNotFound,
      InvitationHasAlreadyBeenAcceptedByAnotherPrereviewer: () => NoPermissionPage,
      NothingToDo: Effect.fnUntraced(
        function* () {
          const authorInvites = yield* AuthorInvites

          const reviewId = yield* authorInvites.getReviewIdForInvitation(invitationId)

          return RedirectResponse({ location: Routes.AuthorInvitePublished.href({ reviewId }) })
        },
        Effect.catch(() => HavingProblemsPage),
      ),
      PrereviewerIsNotListedOnTheReview: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
)
