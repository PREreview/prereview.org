import { Schema } from 'effect'
import * as Preprints from '../Preprints/index.ts'
import { NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'
import { HtmlSchema } from '../html.ts'
import { UuidSchema } from '../types/Uuid.ts'
import { DoiSchema } from '../types/Doi.ts'
import { IndeterminatePreprintId } from '../Preprints/index.ts'
import { Iso6391Schema } from '../types/iso639.ts'
import { InstantSchema } from '../types/Temporal.ts'
import { NameSchema } from '../types/Name.ts'
import { SensitiveData } from '../SensitiveData.ts'

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

const StructuredPrereviewSchema = Schema.Struct({
  question1: Schema.Struct({
    answer: Schema.Literals(['yes', 'unsure', 'not applicable', 'no']),
    comment: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
  }),
})

export class PrereviewImported extends Schema.TaggedClass<PrereviewImported>()('PrereviewImported', {
  addendum: Schema.optional(HtmlSchema),
  authors: Schema.NonEmptyArray(
    Schema.TaggedUnion({
      PublicPersona: { name: SensitiveData(NameSchema), orcidId: OrcidId.OrcidIdSchema },
      PseudonymPersona: { orcidId: OrcidId.OrcidIdSchema },
      Unknown: { name: SensitiveData(NameSchema) },
    }),
  ),
  otherAuthors: Schema.Int,
  club: Schema.optional(UuidSchema),
  doi: DoiSchema,
  id: Schema.Int,
  license: Schema.Literals(['CC0-1.0', 'CC-BY-4.0']),
  published: InstantSchema,
  preprint: IndeterminatePreprintId,
  live: Schema.Boolean,
  useOfAi: Schema.TaggedUnion({
    Yes: { comment: Schema.OptionFromNullOr(NonEmptyString.NonEmptyStringSchema) },
    No: {},
  }),
  competingInterests: Schema.OptionFromNullOr(NonEmptyString.NonEmptyStringSchema),
  language: Iso6391Schema,
  content: Schema.TaggedUnion({
    Structured: StructuredPrereviewSchema.fields,
    FreeText: { text: HtmlSchema },
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
