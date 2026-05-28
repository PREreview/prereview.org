import { Schema } from 'effect'
import { OrcidId, Temporal, Uuid } from '../types/index.ts'

export class AuthorInviteAccepted extends Schema.TaggedClass<AuthorInviteAccepted>()('AuthorInviteAccepted', {
  invitationId: Uuid.UuidSchema,
  orcidId: OrcidId.OrcidIdSchema,
  acceptedAt: Temporal.InstantSchema,
}) {}
