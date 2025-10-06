import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { toUrl } from 'doi-ts'
import { Effect, pipe, Schema } from 'effect'
import * as _ from '../../../src/ExternalApis/OpenAlex/Work.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from './fc.ts'

describe('getWorkByDoi', () => {
  test.prop([
    fc.doi(),
    fc.work().chain(work =>
      fc.tuple(
        fc.fetchResponse({
          status: fc.constant(StatusCodes.OK),
          json: fc.constant(Schema.encodeSync(_.WorkSchema)(work)),
        }),
        fc.constant(work),
      ),
    ),
  ])('when the work can be decoded', (doi, [response, expected]) =>
    Effect.gen(function* () {
      const clientSpy = jest.fn((_: HttpClientRequest.HttpClientRequest) => response)
      const client = stubbedClient(clientSpy)

      const actual = yield* pipe(_.getWorkByDoi(doi), Effect.provideService(HttpClient.HttpClient, client))

      expect(actual).toStrictEqual(expected)
      expect(clientSpy).toHaveBeenCalledWith(HttpClientRequest.get(`https://api.openalex.org/works/${toUrl(doi).href}`))
    }).pipe(EffectTest.run),
  )

  test.prop([fc.doi(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })])(
    "when the work can't be decoded",
    (doi, response) =>
      Effect.gen(function* () {
        const client = stubbedClient(() => response)

        const actual = yield* pipe(
          Effect.flip(_.getWorkByDoi(doi)),
          Effect.provideService(HttpClient.HttpClient, client),
        )

        expect(actual).toStrictEqual(expect.objectContaining({ _tag: 'WorkIsUnavailable' }))
      }).pipe(EffectTest.run),
  )

  test.prop([fc.doi(), fc.fetchResponse({ status: fc.constantFrom(StatusCodes.NotFound, StatusCodes.Gone) })])(
    'when the work is not found',
    (doi, response) =>
      Effect.gen(function* () {
        const client = stubbedClient(() => response)

        const actual = yield* pipe(
          Effect.flip(_.getWorkByDoi(doi)),
          Effect.provideService(HttpClient.HttpClient, client),
        )

        expect(actual).toStrictEqual(new _.WorkIsNotFound({ cause: response }))
      }).pipe(EffectTest.run),
  )

  test.prop([
    fc.doi(),
    fc.fetchResponse({
      status: fc
        .statusCode()
        .filter(status => ![StatusCodes.OK, StatusCodes.NotFound, StatusCodes.Gone].includes(status as never)),
    }),
  ])('when the status code is not ok', (doi, response) =>
    Effect.gen(function* () {
      const client = stubbedClient(() => response)

      const actual = yield* pipe(Effect.flip(_.getWorkByDoi(doi)), Effect.provideService(HttpClient.HttpClient, client))

      expect(actual).toStrictEqual(new _.WorkIsUnavailable({ cause: response }))
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.doi(),
    fc.fetchResponse({
      status: fc
        .statusCode()
        .filter(status => ![StatusCodes.OK, StatusCodes.NotFound, StatusCodes.Gone].includes(status as never)),
    }),
  ])('when the status code is not ok', (doi, response) =>
    Effect.gen(function* () {
      const client = stubbedClient(() => response)

      const actual = yield* pipe(Effect.flip(_.getWorkByDoi(doi)), Effect.provideService(HttpClient.HttpClient, client))

      expect(actual).toStrictEqual(new _.WorkIsUnavailable({ cause: response }))
    }).pipe(EffectTest.run),
  )

  test.prop([fc.doi(), fc.httpClientError()])('when the request fails', (doi, error) =>
    Effect.gen(function* () {
      const client = stubbedFailingClient(() => error)

      const actual = yield* pipe(Effect.flip(_.getWorkByDoi(doi)), Effect.provideService(HttpClient.HttpClient, client))

      expect(actual).toStrictEqual(new _.WorkIsUnavailable({ cause: error }))
    }).pipe(EffectTest.run),
  )
})

describe('getCategories', () => {
  test.prop([
    fc
      .uniqueArray(fc.record({ id: fc.url(), display_name: fc.string() }), {
        minLength: 8,
        maxLength: 8,
        selector: record => record.id.href,
      })
      .chain(categories =>
        fc.tuple(
          fc.work({
            topics: fc.constant([
              { ...categories[0]!, subfield: categories[1]!, field: categories[2]!, domain: categories[3]! },
              { ...categories[0]!, subfield: categories[4]!, field: categories[2]!, domain: categories[3]! },
              { ...categories[5]!, subfield: categories[1]!, field: categories[6]!, domain: categories[7]! },
            ]),
          }),
          fc.constant(categories),
        ),
      ),
  ])('removes duplicates', ([work, expected]) => {
    const actual = _.getCategories(work)

    expect(actual).toStrictEqual(expected)
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
