import { HttpClient } from '@effect/platform'
import { Data, Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export class UnableToSendCoarNotifyMessage extends Data.TaggedError('UnableToSendCoarNotifyMessage')<{
  cause?: unknown
}> {}

export const SendMessage = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.andThen(HandleResponse),
  Effect.catchAll(error => new UnableToSendCoarNotifyMessage({ cause: error })),
)
