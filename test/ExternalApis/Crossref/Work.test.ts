import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Effect, pipe, Tuple } from 'effect'
import * as _ from '../../../src/ExternalApis/Crossref/Work.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('GetWork', () => {
  test.prop(
    [fc.doi().map(doi => Tuple.make(doi, new URL(encodeURIComponent(doi), 'https://api.crossref.org/works/').href))],
    {
      examples: [
        [[Doi('10.2139/ssrn.5186959'), 'https://api.crossref.org/works/10.2139%2Fssrn.5186959']],
        [
          [
            Doi('10.1002/(SICI)1521-3951(199911)216:1<135::AID-PSSB135>3.0.CO;2-#'),
            'https://api.crossref.org/works/10.1002%2F(SICI)1521-3951(199911)216%3A1%3C135%3A%3AAID-PSSB135%3E3.0.CO%3B2-%23',
          ],
        ],
      ],
    },
  )('calls the work API', ([doi, expectedUrl]) =>
    Effect.gen(function* () {
      const clientSpy = jest.fn((_: HttpClientRequest.HttpClientRequest) => new Response())
      const client = stubbedClient(clientSpy)

      yield* pipe(Effect.flip(_.GetWork(doi)), Effect.provideService(HttpClient.HttpClient, client))

      expect(clientSpy).toHaveBeenCalledWith(HttpClientRequest.get(expectedUrl))
    }).pipe(EffectTest.run),
  )

  describe('with a response', () => {
    describe('with a 200 status code', () => {
      describe('with a unknown body', () => {
        test.prop([fc.doi(), fc.string()])('returns an error', (doi, body) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(body, { status: 200 }))

            const actual = yield* pipe(
              Effect.flip(_.GetWork(doi)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('WorkIsUnavailable')
            expect(actual.cause).toStrictEqual(
              expect.objectContaining({ _tag: expect.stringMatching(/^ParseError|ResponseError$/) }),
            )
          }).pipe(EffectTest.run),
        )
      })
    })

    describe('with a 404 status code', () => {
      test.prop([fc.doi()])('always fails', doi =>
        Effect.gen(function* () {
          const client = stubbedClient(() => new Response(null, { status: 404 }))

          const actual = yield* pipe(Effect.flip(_.GetWork(doi)), Effect.provideService(HttpClient.HttpClient, client))

          expect(actual._tag).toStrictEqual('WorkIsNotFound')
          expect(actual.cause).toStrictEqual(expect.objectContaining({ status: 404 }))
        }).pipe(EffectTest.run),
      )
    })

    describe('with another status code', () => {
      test.prop([fc.doi(), fc.statusCode().filter(status => status >= 201 && status !== 404)])(
        'with another status code',
        (doi, status) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(null, { status }))

            const actual = yield* pipe(
              Effect.flip(_.GetWork(doi)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('WorkIsUnavailable')
            expect(actual.cause).toStrictEqual(expect.objectContaining({ status }))
          }).pipe(EffectTest.run),
      )
    })
  })

  describe('with a request error', () => {
    test.prop([fc.doi(), fc.httpClientRequestError()])('returns unavailable', (doi, error) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(() => error)
        const actual = yield* pipe(Effect.flip(_.GetWork(doi)), Effect.provideService(HttpClient.HttpClient, client))

        expect(actual._tag).toStrictEqual('WorkIsUnavailable')
        expect(actual.cause).toStrictEqual(error)
      }).pipe(EffectTest.run),
    )
  })

  describe('with a response error', () => {
    test.prop([fc.doi(), fc.httpClientResponseError()])('returns unavailable', (doi, error) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(() => error)
        const actual = yield* pipe(Effect.flip(_.GetWork(doi)), Effect.provideService(HttpClient.HttpClient, client))

        expect(actual._tag).toStrictEqual('WorkIsUnavailable')
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
