import type { Effect } from 'effect'
import type { AuthorInvites } from '../../../AuthorInvites/index.ts'
import type { Locale } from '../../../Context.ts'
import type * as Personas from '../../../Personas/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import type { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'

export const ConfirmAuthorChoicesPage = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invitationId,
}: {
  invitationId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | Personas.Personas | AuthorInvites> => HavingProblemsPage

export const ConfirmAuthorChoicesSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invitationId,
}: {
  invitationId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | AuthorInvites> => HavingProblemsPage
