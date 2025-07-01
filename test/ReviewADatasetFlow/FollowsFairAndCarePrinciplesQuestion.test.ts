import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Locale } from '../../src/Context.js'
import * as _ from '../../src/ReviewADatasetFlow/FollowsFairAndCarePrinciplesQuestion/index.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
  'FollowsFairAndCarePrinciplesQuestion',
  (datasetReviewId, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.FollowsFairAndCarePrinciplesQuestion({ datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provideService(Locale, locale), Effect.provideService(LoggedInUser, user), EffectTest.run),
)

test.prop([fc.uuid(), fc.urlParams(), fc.supportedLocale(), fc.user()])(
  'FollowsFairAndCarePrinciplesSubmission',
  (datasetReviewId, body, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.FollowsFairAndCarePrinciplesSubmission({ body, datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provideService(Locale, locale), Effect.provideService(LoggedInUser, user), EffectTest.run),
)
