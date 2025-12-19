import { Schema } from 'effect'

export type UsersProfileGetResponse = Schema.Schema.Type<typeof UsersProfileGetResponse>

export const UsersProfileGetResponse = Schema.Struct({
  realName: Schema.propertySignature(Schema.NonEmptyString).pipe(Schema.fromKey('real_name')),
  image48: Schema.propertySignature(Schema.URL).pipe(Schema.fromKey('image_48')),
})
