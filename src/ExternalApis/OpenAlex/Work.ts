import { Data, Schema } from 'effect'

export type Work = typeof WorkSchema.Type

export const WorkSchema = Schema.Struct({
  title: Schema.String,
  keywords: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Schema.String,
      score: Schema.Number,
    }),
  ),
  topics: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Schema.String,
      subfield: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      field: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      domain: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
    }),
  ),
})

export class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

export class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}
