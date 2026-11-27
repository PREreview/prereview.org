import { Schema } from 'effect'
import { Uuid } from '../../types/index.ts'

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
    parent: Schema.StructWithRest(
      Schema.Struct({
        communities: Schema.StructWithRest(Schema.Struct({ ids: Schema.optionalKey(Schema.Array(Uuid.UuidSchema)) }), [
          Schema.JsonObject,
        ]),
      }),
      [Schema.JsonObject],
    ),
    metadata: Schema.StructWithRest(
      Schema.Struct({
        resource_type: Schema.StructWithRest(Schema.Struct({ id: Schema.String }), [Schema.JsonObject]),
        title: Schema.String,
        description: Schema.optionalKey(Schema.String),
        publication_date: Schema.String,
      }),
      [Schema.JsonObject],
    ),
  }),
  [Schema.JsonObject],
)
