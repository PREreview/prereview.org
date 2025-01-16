import { HttpClient } from '@effect/platform'
import { NodeHttpClient } from '@effect/platform-node'
import { expect, test } from '@jest/globals'
import { Effect } from 'effect'

test('test', () =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const originalResponse = yield* client.get('https://api.crossref.org/works/10.1101/2024.11.04.24316579')
    const testResponse = yield* client.get('https://api.crossref.org/works/10.1101/2024.11.04.24316579')

    expect(testResponse.status).toStrictEqual(originalResponse.status)
    expect(testResponse.headers).toStrictEqual(originalResponse.headers)
    expect(yield* testResponse.text).toStrictEqual(yield* originalResponse.text)
  }).pipe(Effect.scoped, Effect.provide(NodeHttpClient.layer), Effect.runPromise))
