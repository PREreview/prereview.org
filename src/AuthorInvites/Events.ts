import { Schema } from 'effect'
import { OrcidId, Temporal, Uuid } from '../types/index.ts'

export class AuthorInviteAccepted extends Schema.TaggedClass<AuthorInviteAccepted>()('AuthorInviteAccepted', {
  invitationId: Uuid.UuidSchema,
  reviewId: Uuid.UuidSchema,
  orcidId: OrcidId.OrcidIdSchema,
  acceptedAt: Temporal.InstantSchema,
}) {}

export class PersonaForAReviewChosen extends Schema.TaggedClass<PersonaForAReviewChosen>()('PersonaForAReviewChosen', {
  reviewId: Uuid.UuidSchema,
  orcidId: OrcidId.OrcidIdSchema,
  persona: Schema.Literal('public', 'pseudonym'),
}) {}

export const AuthorInviteEvent = Schema.Union(AuthorInviteAccepted, PersonaForAReviewChosen)
