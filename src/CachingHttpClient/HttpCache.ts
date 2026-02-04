import { Headers, type HttpClientRequest, type HttpClientResponse } from '@effect/platform'
import { Context, Data, type DateTime, type Effect, type Option, Schema } from 'effect'

export interface CacheValue {
  staleAt: DateTime.Utc
  response: StoredResponse
}

type StoredResponse = typeof StoredResponseSchema.Encoded

export const StoredResponseSchema = Schema.Struct({
  status: Schema.Number,
  headers: Headers.schema,
  body: Schema.String,
})

const CacheValueSchema = Schema.Struct({
  staleAt: Schema.DateTimeUtcFromNumber,
  response: StoredResponseSchema,
})

export const CacheValueFromStringSchema = Schema.parseJson(CacheValueSchema)

export class InternalHttpCacheFailure extends Data.TaggedError('InternalHttpCacheFailure')<{ cause: unknown }> {}

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  {
    get: (
      request: HttpClientRequest.HttpClientRequest,
    ) => Effect.Effect<
      Option.Option<{ staleAt: DateTime.Utc; response: HttpClientResponse.HttpClientResponse }>,
      InternalHttpCacheFailure
    >
    set: (
      response: HttpClientResponse.HttpClientResponse,
      staleAt: DateTime.Utc,
    ) => Effect.Effect<void, InternalHttpCacheFailure>
    delete: (url: URL) => Effect.Effect<void, InternalHttpCacheFailure>
  }
>() {}
