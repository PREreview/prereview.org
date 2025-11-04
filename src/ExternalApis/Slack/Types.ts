import { Data, Schema } from 'effect'

const ChannelIdBrand: unique symbol = Symbol.for('ChannelId')

export type ChannelId = typeof ChannelId.Type

export const ChannelId = Schema.String.pipe(Schema.brand(ChannelIdBrand))

const UserIdBrand: unique symbol = Symbol.for('UserId')

export type UserId = typeof UserId.Type

export const UserId = Schema.String.pipe(Schema.brand(UserIdBrand))

export const Response = Schema.Union(
  Schema.Struct({ ok: Schema.Literal(true) }),
  Schema.Struct({ ok: Schema.Literal(false), error: Schema.String }),
)

export class SlackError extends Data.TaggedError('SlackError')<{
  message: string
}> {}
