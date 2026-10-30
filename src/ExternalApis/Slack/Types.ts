import { Data, Schema } from 'effect'

export type Timestamp = typeof Timestamp.Type

export const Timestamp = Schema.String.pipe(Schema.brand('Timestamp'))

export type ChannelId = typeof ChannelId.Type

export const ChannelId = Schema.String.pipe(Schema.brand('ChannelId'))

export type UserId = typeof UserId.Type

export const UserId = Schema.String.pipe(Schema.brand('UserId'))

export const Response = <Fields extends Schema.Struct.Fields>(schema: Schema.Struct<Fields>) =>
  Schema.Union(
    Schema.Struct({ ...schema.fields, ok: Schema.Literal(true) }),
    Schema.Struct({ ok: Schema.Literal(false), error: Schema.String }),
  )

export class SlackError extends Data.TaggedError('SlackError')<{
  message: string
}> {}
