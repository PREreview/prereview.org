import { Effect } from 'effect'
import { AuthorInvites } from '../../../AuthorInvites/index.ts'
import type { Locale } from '../../../Context.ts'
import { Temporal } from '../../../types/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { NoPermissionPage } from '../../NoPermissionPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import type { Response } from '../../Response/index.ts'

export const AcceptInvite = ({
  invitationId,
}: {
  invitationId: Uuid
}): Effect.Effect<Response, never, AuthorInvites | LoggedInUser | Locale> =>
  Effect.gen(function* () {
    const authorInvites = yield* AuthorInvites
    const user = yield* LoggedInUser
    const acceptedAt = yield* Temporal.currentInstant

    yield* authorInvites.acceptInvite({ invitationId, orcidId: user.orcid, acceptedAt })
    return yield* HavingProblemsPage
  }).pipe(
    Effect.catchTags({
      InvitationNotFound: () => PageNotFound,
      InvitationHasAlreadyBeenAcceptedByAnotherPrereviewer: () => NoPermissionPage,
      UnableToHandleCommand: () => HavingProblemsPage,
    }),
  )
