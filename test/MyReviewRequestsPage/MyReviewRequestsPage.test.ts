import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as _ from '../../src/MyReviewRequestsPage/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

test.prop([fc.supportedLocale()])('MyReviewRequestsPage', locale =>
  Effect.gen(function* () {
    const actual = yield* _.MyReviewRequestsPage

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
)
