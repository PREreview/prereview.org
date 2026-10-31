import { Headers, type HttpClientRequest, type HttpClientResponse } from 'effect/http'
import { Context, Data, type DateTime, type Effect, type Option, Schema, SchemaTransformation } from 'effect'

export interface CacheValue {
  staleAt: DateTime.Utc
  response: StoredResponse
}

type StoredResponse = typeof StoredResponseSchema.Encoded

const HeadersFromRecordSchema = Schema.Record(Schema.String, Schema.String).pipe(
  Schema.decodeTo(
    Schema.Headers,
    SchemaTransformation.transform({
      decode: (record: Readonly<Record<string, string>>) => Headers.fromInput(record),
      encode: (headers): Readonly<Record<string, string>> => headers,
    }),
  ),
)

export const StoredResponseSchema = Schema.Struct({
  status: Schema.Number,
  headers: HeadersFromRecordSchema,
  body: Schema.String,
})

const CacheValueSchema = Schema.Struct({
  staleAt: Schema.DateTimeUtcFromMillis,
  response: StoredResponseSchema,
})

export const CacheValueFromStringSchema = Schema.fromJsonString(CacheValueSchema)

export class InternalHttpCacheFailure extends Data.TaggedError('InternalHttpCacheFailure')<{ cause: unknown }> {}

export class HttpCache extends Context.Service<
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
>()('HttpCache') {}
