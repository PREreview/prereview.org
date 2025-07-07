import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Locale } from '../src/Context.js'
import * as FeatureFlags from '../src/FeatureFlags.js'
import * as _ from '../src/LogInDemoUser.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

describe('LogInDemoUser', () => {
  test.prop([fc.supportedLocale()])('when can log in as the demo user', locale =>
    Effect.gen(function* () {
      const actual = yield* _.LogInDemoUser

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provideService(Locale, locale), Effect.provide(featureFlagsLayer(true)), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])("when can't log in as the demo user", locale =>
    Effect.gen(function* () {
      const actual = yield* _.LogInDemoUser

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NOT_FOUND,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provideService(Locale, locale), Effect.provide(featureFlagsLayer(false)), EffectTest.run),
  )
})

const featureFlagsLayer = (canLogInAsDemoUser: boolean) =>
  FeatureFlags.layer({
    aiReviewsAsCc0: shouldNotBeCalled,
    canAddMultipleAuthors: shouldNotBeCalled,
    canChooseLocale: false,
    canLogInAsDemoUser,
    canReviewDatasets: false,
    canSeeDesignTweaks: false,
    canSeeHomePageChanges: shouldNotBeCalled,
    useCrowdinInContext: false,
  })
