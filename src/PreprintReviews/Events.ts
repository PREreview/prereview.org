import { Schema } from 'effect'
import * as Preprints from '../Preprints/index.ts'
import { NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'

export class RapidPrereviewImported extends Schema.TaggedClass<RapidPrereviewImported>()('RapidPrereviewImported', {
  author: Schema.Struct({
    persona: Schema.Literals(['public', 'pseudonym']),
    orcidId: OrcidId.OrcidIdSchema,
  }),
  publishedAt: Temporal.InstantSchema,
  preprintId: Preprints.IndeterminatePreprintIdFromStringSchema,
  rapidPrereviewId: Uuid.UuidSchema,
  questions: Schema.Struct({
    availableCode: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    availableData: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    coherent: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    dataLink: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    ethics: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    future: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    limitations: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    methods: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    newData: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    novel: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    peerReview: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    recommend: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    reproducibility: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    technicalComments: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    editorialComments: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
  }),
}) {}

export class EmailToNotifyPrereviewerOfAPrereviewWasSent extends Schema.TaggedClass<EmailToNotifyPrereviewerOfAPrereviewWasSent>()(
  'EmailToNotifyPrereviewerOfAPrereviewWasSent',
  {
    sentAt: Temporal.InstantSchema,
    orcidId: OrcidId.OrcidIdSchema,
    prereviewId: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  },
) {}
