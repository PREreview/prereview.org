import { Data, Schema } from 'effect'
import { Name, OrcidId } from '../../types/index.ts'

export type Work = typeof WorkSchema.Type

export const WorkSchema = Schema.Struct({
  title: Schema.String,
  abstract_inverted_index: Schema.OptionFromNullOr(Schema.Record(Schema.String, Schema.Array(Schema.Int))),
  authorships: Schema.Array(
    Schema.Struct({
      author: Schema.Struct({
        display_name: Schema.OptionFromNullOr(Name.NameSchema),
        orcid: Schema.OptionFromNullOr(OrcidId.OrcidIdFromUrlSchema),
      }),
      raw_author_name: Name.NameSchema,
    }),
  ),
  keywords: Schema.Array(
    Schema.Struct({
      id: Schema.URLFromString,
      display_name: Name.NameSchema,
    }),
  ),
  topics: Schema.Array(
    Schema.Struct({
      id: Schema.URLFromString,
      display_name: Name.NameSchema,
      subfield: Schema.Struct({
        id: Schema.URLFromString,
        display_name: Name.NameSchema,
      }),
      field: Schema.Struct({
        id: Schema.URLFromString,
        display_name: Name.NameSchema,
      }),
      domain: Schema.Struct({
        id: Schema.URLFromString,
        display_name: Name.NameSchema,
      }),
    }),
  ),
})

export class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

export class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}
