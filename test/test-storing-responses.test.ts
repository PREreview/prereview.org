import { Headers, HttpClient } from '@effect/platform'
import { NodeHttpClient } from '@effect/platform-node'
import { expect, test } from '@jest/globals'
import { Effect, pipe, Schema } from 'effect'

const StoredResponseSchema = Schema.Struct({
  status: Schema.Number,
  headers: Schema.Record({ key: Schema.String, value: Schema.String }),
  body: Schema.String,
})

test('test', () =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const originalResponse = yield* client.get('https://api.crossref.org/works/10.1101/2024.11.04.24316579')
    const testResponse = yield* pipe(
      originalResponse,
      response =>
        Effect.gen(function* () {
          return {
            status: response.status,
            headers: response.headers,
            body: yield* response.text,
          }
        }),
      Effect.andThen(Schema.encode(StoredResponseSchema)),
      Effect.andThen(Schema.decode(StoredResponseSchema)),
      Effect.andThen(stored => ({
        ...stored,
        headers: Headers.fromInput(stored.headers),
        text: Effect.succeed(stored.body),
      })),
    )

    expect(testResponse.status).toStrictEqual(originalResponse.status)
    expect(testResponse.headers).toStrictEqual(originalResponse.headers)
    expect(yield* testResponse.text).toStrictEqual(yield* originalResponse.text)
  }).pipe(Effect.scoped, Effect.provide(NodeHttpClient.layer), Effect.runPromise))
