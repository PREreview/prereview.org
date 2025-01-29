import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Effect, pipe, TestContext, Tuple } from 'effect'
import * as _ from '../../src/JapanLinkCenter/Record.js'
import * as fc from '../fc.js'

describe('getRecord', () => {
  test.prop(
    [
      fc
        .doi()
        .map(doi =>
          Tuple.make(
            doi,
            new URL(encodeURIComponent(encodeURIComponent(doi)), 'https://api.japanlinkcenter.org/dois/').href,
          ),
        ),
    ],
    {
      examples: [
        [[Doi('10.51094/jxiv.1041'), 'https://api.japanlinkcenter.org/dois/10.51094%252Fjxiv.1041']],
        [[Doi('10.51094/jxiv.1041/1'), 'https://api.japanlinkcenter.org/dois/10.51094%252Fjxiv.1041%252F1']],
      ],
    },
  )('calls the record API', ([doi, expectedUrl]) =>
    Effect.gen(function* () {
      const clientSpy = jest.fn((_: HttpClientRequest.HttpClientRequest) => new Response())
      const client = stubbedClient(clientSpy)

      yield* pipe(Effect.flip(_.getRecord(doi)), Effect.provideService(HttpClient.HttpClient, client))

      expect(clientSpy).toHaveBeenCalledWith(HttpClientRequest.get(expectedUrl))
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
  )

  describe('with a response', () => {
    describe('with a 404 status code', () => {
      test.prop([fc.doi()])('always fails', doi =>
        Effect.gen(function* () {
          const client = stubbedClient(() => new Response(null, { status: 404 }))

          const actual = yield* pipe(
            Effect.flip(_.getRecord(doi)),
            Effect.provideService(HttpClient.HttpClient, client),
          )

          expect(actual._tag).toStrictEqual('RecordIsNotFound')
          expect(actual.cause).toStrictEqual(expect.objectContaining({ status: 404 }))
        }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
      )
    })

    describe('with another status code', () => {
      test.prop([fc.doi(), fc.statusCode().filter(status => status >= 200 && status !== 404)])(
        'with another status code',
        (doi, status) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(null, { status }))

            const actual = yield* pipe(
              Effect.flip(_.getRecord(doi)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('RecordIsUnavailable')
            expect(actual.cause).toStrictEqual(expect.objectContaining({ status }))
          }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
      )
    })
  })

  describe('with a request error', () => {
    test.prop([fc.doi(), fc.constantFrom('Transport', 'Encode', 'InvalidUrl')])('returns unavailable', (doi, reason) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(request => new HttpClientError.RequestError({ request, reason }))
        const actual = yield* pipe(Effect.flip(_.getRecord(doi)), Effect.provideService(HttpClient.HttpClient, client))

        expect(actual._tag).toStrictEqual('RecordIsUnavailable')
        expect(actual.cause).toStrictEqual(expect.objectContaining({ _tag: 'RequestError', reason }))
      }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
    )
  })

  describe('with a response error', () => {
    test.prop([fc.doi(), fc.constantFrom('StatusCode', 'Decode', 'EmptyBody')])('returns unavailable', (doi, reason) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(
          request =>
            new HttpClientError.ResponseError({
              request,
              response: HttpClientResponse.fromWeb(request, new Response()),
              reason,
            }),
        )
        const actual = yield* pipe(Effect.flip(_.getRecord(doi)), Effect.provideService(HttpClient.HttpClient, client))

        expect(actual._tag).toStrictEqual('RecordIsUnavailable')
        expect(actual.cause).toStrictEqual(expect.objectContaining({ _tag: 'ResponseError', reason }))
      }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
    )
  })
})

const stubbedClient = (f: (request: HttpClientRequest.HttpClientRequest) => Response) =>
  HttpClient.makeWith<never, never, never, never>(
    Effect.andThen(request => HttpClientResponse.fromWeb(request, f(request))),
    Effect.succeed,
  )

const stubbedFailingClient = (f: (request: HttpClientRequest.HttpClientRequest) => HttpClientError.HttpClientError) =>
  HttpClient.makeWith<never, never, HttpClientError.HttpClientError, never>(
    Effect.andThen(request => Effect.fail(f(request))),
    Effect.succeed,
  )
