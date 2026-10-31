import { Schema } from 'effect'

export type UsersProfileGetResponse = Schema.Schema.Type<typeof UsersProfileGetResponse>

export const UsersProfileGetResponse = Schema.Struct({
  realName: Schema.NonEmptyString,
  image48: Schema.URLFromString,
}).pipe(Schema.encodeKeys({ realName: 'real_name', image48: 'image_48' }))
