import { Schema } from 'effect'
import { Doi, Uuid } from '../../types/index.ts'

export type Draft = typeof Draft.Type

export const Draft = Schema.StructWithRest(
  Schema.Struct({
    id: Schema.FiniteFromString.check(Schema.isInt()),
    access: Schema.StructWithRest(
      Schema.Struct({
        record: Schema.Literals(['public', 'restricted']),
        files: Schema.Literals(['public', 'restricted']),
      }),
      [Schema.JsonObject],
    ),
    pids: Schema.StructWithRest(
      Schema.Struct({
        doi: Schema.optionalKey(
          Schema.StructWithRest(Schema.Struct({ identifier: Doi.DoiSchema }), [Schema.JsonObject]),
        ),
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
