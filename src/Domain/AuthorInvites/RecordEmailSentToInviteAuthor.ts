import * as Events from '../../Events.ts'
import { Commands } from '../../EventSourcing/index.ts'
import type { Temporal } from '../../types/index.ts'
import type { Uuid } from '../../types/Uuid.ts'

export interface Input {
  readonly invitationId: Uuid
  readonly sentAt: Temporal.Instant
}

const decide = (input: Input): Events.Event => new Events.EmailToInviteAuthorSent(input)

export const RecordEmailSentToInviteAuthor = Commands.StatelessCommand({
  name: 'AuthorInvites.recordEmailSentToInviteAuthor',
  decide,
})
