import type { HttpClient } from '@effect/platform'
import { Data, type Effect } from 'effect'
import type { Message } from '../Types.ts'

export class UnableToSendCoarNotifyMessage extends Data.TaggedError('UnableToSendCoarNotifyMessage')<{
  cause?: unknown
}> {}

export declare const SendMessage: (
  message: Message,
) => Effect.Effect<void, UnableToSendCoarNotifyMessage, HttpClient.HttpClient>
