import { HttpClient } from 'effect/http'
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
  Effect.catch(error => new UnableToSendCoarNotifyMessage({ cause: error })),
  Effect.withSpan('CoarNotify.sendMessage'),
)
