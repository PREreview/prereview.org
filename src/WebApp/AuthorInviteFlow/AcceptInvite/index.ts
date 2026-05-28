import type { Effect } from 'effect'
import type { AuthorInvites } from '../../../AuthorInvites/index.ts'
import type { Locale } from '../../../Context.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import type { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'

export const AcceptInvite = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invitationId,
}: {
  invitationId: Uuid
}): Effect.Effect<Response, never, AuthorInvites | LoggedInUser | Locale> => HavingProblemsPage
