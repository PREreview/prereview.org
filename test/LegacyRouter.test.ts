import { Headers, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as _ from '../src/LegacyRouter.js'

describe('LegacyRouter', () => {
  test.each([['/10.1101/2020.08.27.270835', '/preprints/doi-10.1101-2020.08.27.270835']])(
    'redirects %s',
    (path, expected) =>
      Effect.gen(function* () {
        const request = HttpServerRequest.fromWeb(new Request(`http://localhost/${path}`))

        const response = yield* Effect.provideService(_.LegacyRouter, HttpServerRequest.HttpServerRequest, request)

        expect(response).toStrictEqual(
          HttpServerResponse.empty({
            status: StatusCodes.MOVED_PERMANENTLY,
            headers: Headers.fromInput({ location: expected }),
          }),
        )
      }).pipe(Effect.provide(TestContext.TestContext), Effect.runSync),
  )
})
