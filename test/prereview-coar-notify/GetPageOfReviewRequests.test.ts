import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse, UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, pipe, Schema, Tuple } from 'effect'
import * as _ from '../../src/prereview-coar-notify/GetPageOfReviewRequests.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from './fc.ts'

describe('getPageOfReviewRequests', () => {
  test.prop(
    [
      fc
        .tuple(fc.origin(), fc.integer({ min: 1 }))
        .map(([origin, page]) =>
          Tuple.make<[URL, number | undefined, string, UrlParams.UrlParams]>(
            origin,
            page,
            new URL('requests', origin).href,
            UrlParams.fromInput({ page }),
          ),
        ),
    ],
    {
      examples: [
        [[new URL('http://example.com'), undefined, 'http://example.com/requests', UrlParams.fromInput({ page: 1 })]],
        [[new URL('http://example.com'), 2, 'http://example.com/requests', UrlParams.fromInput({ page: 2 })]],
      ],
    },
  )('calls the work API', ([origin, page, expectedUrl, expectedUrlParams]) =>
    Effect.gen(function* () {
      const clientSpy = jest.fn((_: HttpClientRequest.HttpClientRequest) => new Response())
      const client = stubbedClient(clientSpy)

      yield* pipe(
        Effect.flip(_.getPageOfReviewRequests(origin, page)),
        Effect.provideService(HttpClient.HttpClient, client),
      )

      expect(clientSpy).toHaveBeenCalledWith(HttpClientRequest.get(expectedUrl, { urlParams: expectedUrlParams }))
    }).pipe(EffectTest.run),
  )

  describe('with a response', () => {
    describe('with a 200 status code', () => {
      describe('with a valid body', () => {
        test.prop([
          fc.origin(),
          fc
            .array(
              fc.record({
                timestamp: fc.instant(),
                preprint: fc
                  .indeterminatePreprintIdWithDoi()
                  .filter(
                    id =>
                      ![
                        'BiorxivPreprintId',
                        'MedrxivPreprintId',
                        'OsfPreprintId',
                        'LifecycleJournalPreprintId',
                        'ZenodoPreprintId',
                        'AfricarxivZenodoPreprintId',
                      ].includes(id._tag),
                  ),
                fields: fc.array(fc.fieldId()),
                subfields: fc.array(fc.subfieldId()),
                language: fc.languageCode(),
              }),
            )
            .map(requests =>
              Tuple.make(requests, Schema.encodeSync(Schema.parseJson(_.ReviewRequestsSchema))(requests)),
            ),
        ])('returns the list', async (origin, [requests, body]) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(body, { status: 200 }))

            const actual = yield* pipe(
              _.getPageOfReviewRequests(origin),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual).toStrictEqual(requests)
          }).pipe(EffectTest.run),
        )
      })

      describe('with a unknown body', () => {
        test.prop([fc.origin(), fc.string()])('returns unavailable', (origin, body) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(body, { status: 200 }))

            const actual = yield* pipe(
              Effect.flip(_.getPageOfReviewRequests(origin)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('ReviewRequestsAreUnavailable')
            expect(actual.cause).toStrictEqual(
              expect.objectContaining({ _tag: expect.stringMatching(/^ParseError|ResponseError$/) }),
            )
          }).pipe(EffectTest.run),
        )
      })
    })

    describe('with a non-200 status code', () => {
      test.prop([fc.origin(), fc.statusCode().filter(status => status >= 201)])(
        'returns unavailable',
        (origin, status) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(null, { status }))

            const actual = yield* pipe(
              Effect.flip(_.getPageOfReviewRequests(origin)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('ReviewRequestsAreUnavailable')
            expect(actual.cause).toStrictEqual(
              expect.objectContaining({ message: expect.stringContaining('invalid status code') }),
            )
          }).pipe(EffectTest.run),
      )
    })
  })

  describe('with a request error', () => {
    test.prop([fc.origin(), fc.httpClientRequestError()])('returns unavailable', (origin, error) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(() => error)
        const actual = yield* pipe(
          Effect.flip(_.getPageOfReviewRequests(origin)),
          Effect.provideService(HttpClient.HttpClient, client),
        )

        expect(actual._tag).toStrictEqual('ReviewRequestsAreUnavailable')
        expect(actual.cause).toStrictEqual(error)
      }).pipe(EffectTest.run),
    )
  })

  describe('with a response error', () => {
    test.prop([fc.origin(), fc.httpClientResponseError()])('returns unavailable', (origin, error) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(() => error)
        const actual = yield* pipe(
          Effect.flip(_.getPageOfReviewRequests(origin)),
          Effect.provideService(HttpClient.HttpClient, client),
        )

        expect(actual._tag).toStrictEqual('ReviewRequestsAreUnavailable')
        expect(actual.cause).toStrictEqual(error)
      }).pipe(EffectTest.run),
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
