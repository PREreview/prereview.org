import { Schema } from 'effect'

export type Draft = typeof Draft.Type

export const Draft = Schema.StructWithRest(
  Schema.Struct({
    id: Schema.String,
    access: Schema.StructWithRest(
      Schema.Struct({
        record: Schema.Literals(['public', 'restricted']),
        files: Schema.Literals(['public', 'restricted']),
      }),
      [Schema.JsonObject],
    ),
    metadata: Schema.StructWithRest(
      Schema.Struct({
        title: Schema.String,
        description: Schema.optionalKey(Schema.String),
      }),
      [Schema.JsonObject],
    ),
  }),
  [Schema.JsonObject],
)
