import { Headers, type HttpClientRequest, type HttpClientResponse, UrlParams } from '@effect/platform'
import { type Cause, Context, type DateTime, type Effect, Schema } from 'effect'

export interface CacheValue {
  staleAt: DateTime.Utc
  response: StoredResponse
}

export type CacheKey = string

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

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  {
    get: (
      request: HttpClientRequest.HttpClientRequest,
    ) => Effect.Effect<
      { staleAt: DateTime.Utc; response: HttpClientResponse.HttpClientResponse },
      Cause.NoSuchElementException | Cause.UnknownException
    >
    set: (response: HttpClientResponse.HttpClientResponse, staleAt: DateTime.Utc) => Effect.Effect<void, Error>
    delete: (url: URL) => Effect.Effect<void>
  }
>() {}

export const keyForRequest = (request: HttpClientRequest.HttpClientRequest): CacheKey => {
  const url = new URL(request.url)
  url.search = UrlParams.toString(request.urlParams)

  return url.href
}
