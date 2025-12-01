import { Data, Schema } from 'effect'

const TimestampBrand: unique symbol = Symbol.for('Timestamp')

export type Timestamp = typeof Timestamp.Type

export const Timestamp = Schema.String.pipe(Schema.brand(TimestampBrand))

const ChannelIdBrand: unique symbol = Symbol.for('ChannelId')

export type ChannelId = typeof ChannelId.Type

export const ChannelId = Schema.String.pipe(Schema.brand(ChannelIdBrand))

const UserIdBrand: unique symbol = Symbol.for('UserId')

export type UserId = typeof UserId.Type

export const UserId = Schema.String.pipe(Schema.brand(UserIdBrand))

export const Response = <A, I, R>(message: Schema.Schema<A, I, R>) =>
  Schema.Union(
    Schema.Struct({ ok: Schema.Literal(true), message }),
    Schema.Struct({ ok: Schema.Literal(false), error: Schema.String }),
  )

export class SlackError extends Data.TaggedError('SlackError')<{
  message: string
}> {}
