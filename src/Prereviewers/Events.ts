import { Schema } from 'effect'
import { OrcidId, Pseudonym, Temporal } from '../types/index.ts'

export class RegisteredPrereviewerImported extends Schema.TaggedClass<RegisteredPrereviewerImported>()(
  'RegisteredPrereviewerImported',
  {
    orcidId: OrcidId.OrcidIdSchema,
    registeredAt: Schema.Union(Temporal.InstantSchema, Schema.Literal('not available from import source')),
    pseudonym: Pseudonym.PseudonymSchema,
  },
) {}
