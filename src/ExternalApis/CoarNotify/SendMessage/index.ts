import type { HttpClient, HttpClientResponse } from '@effect/platform'
import { Data, type Effect } from 'effect'
import type { RequestReview } from '../Types.ts'

export class UnableToSendCoarNotifyMessage extends Data.TaggedError('UnableToSendCoarNotifyMessage')<{
  cause?: unknown
}> {}

export declare const SendMessage: (
  message: RequestReview,
) => Effect.Effect<HttpClientResponse.HttpClientResponse, UnableToSendCoarNotifyMessage, HttpClient.HttpClient>
