import { Data, Schema } from 'effect'
import { Name } from '../../types/index.ts'

export type Work = typeof WorkSchema.Type

export const WorkSchema = Schema.Struct({
  title: Schema.String,
  keywords: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Name.NameSchema,
    }),
  ),
  topics: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Name.NameSchema,
      subfield: Schema.Struct({
        id: Schema.URL,
        display_name: Name.NameSchema,
      }),
      field: Schema.Struct({
        id: Schema.URL,
        display_name: Name.NameSchema,
      }),
      domain: Schema.Struct({
        id: Schema.URL,
        display_name: Name.NameSchema,
      }),
    }),
  ),
})

export class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

export class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}
