import { Schema } from 'effect'
import { OrcidId, Pseudonym, Temporal } from '../types/index.ts'

export class RegisteredPrereviewerImported extends Schema.TaggedClass<RegisteredPrereviewerImported>()(
  'RegisteredPrereviewerImported',
  {
    orcidId: OrcidId.OrcidIdSchema,
    registeredAt: Temporal.InstantSchema,
    pseudonym: Pseudonym.PseudonymSchema,
  },
) {}
