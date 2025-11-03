import { Data, Schema } from 'effect'

const ChannelIdBrand: unique symbol = Symbol.for('ChannelId')

export type ChannelId = typeof ChannelId.Type

export const ChannelId = Schema.String.pipe(Schema.brand(ChannelIdBrand))

export const Response = Schema.Union(
  Schema.Struct({ ok: Schema.Literal(true) }),
  Schema.Struct({ ok: Schema.Literal(false), error: Schema.String }),
)

export class SlackError extends Data.TaggedError('SlackError')<{
  message: string
}> {}
