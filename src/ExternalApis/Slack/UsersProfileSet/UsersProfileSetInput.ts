import { Schema } from 'effect'

export type UsersProfileSetInput = Schema.Schema.Type<typeof UsersProfileSetInput>

export const UsersProfileSetInput = Schema.Struct({
  profile: Schema.Struct({
    fields: Schema.Record(Schema.String, Schema.Struct({ value: Schema.String, alt: Schema.String })),
  }),
})
