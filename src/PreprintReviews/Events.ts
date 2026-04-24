import { Schema } from 'effect'
import * as Preprints from '../Preprints/index.ts'
import { NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'

export class RapidPrereviewImported extends Schema.TaggedClass<RapidPrereviewImported>()('RapidPrereviewImported', {
  author: Schema.Struct({
    persona: Schema.Literal('public', 'pseudonym'),
    orcidId: OrcidId.OrcidIdSchema,
  }),
  publishedAt: Temporal.InstantSchema,
  preprintId: Preprints.IndeterminatePreprintIdFromStringSchema,
  rapidPrereviewId: Uuid.UuidSchema,
  questions: Schema.Struct({
    availableCode: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    availableData: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    coherent: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    dataLink: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    ethics: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    future: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    limitations: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    methods: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    newData: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    novel: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    peerReview: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    recommend: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    reproducibility: Schema.Literal('yes', 'unsure', 'not applicable', 'no'),
    technicalComments: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    editorialComments: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
}) {}
