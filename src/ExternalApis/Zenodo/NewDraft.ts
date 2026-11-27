import { Schema } from 'effect'

export type NewDraft = typeof NewDraft.Type

export const NewDraft = Schema.Struct({
  access: Schema.Struct({
    record: Schema.Literals(['public', 'restricted']),
    files: Schema.Literals(['public', 'restricted']),
  }),
  files: Schema.Struct({ enabled: Schema.Boolean }),
  metadata: Schema.StructWithRest(
    Schema.Struct({
      resource_type: Schema.Struct({ id: Schema.String }),
      title: Schema.String,
    }),
    [Schema.JsonObject],
  ),
})
