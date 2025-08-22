import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../src/Context.js'
import * as FeatureFlags from '../src/FeatureFlags.js'
import * as _ from '../src/LogInDemoUser.js'
import * as StatusCodes from '../src/StatusCodes.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

describe('LogInDemoUser', () => {
  test.prop([fc.supportedLocale()])('when can log in as the demo user', locale =>
    Effect.gen(function* () {
      const actual = yield* _.LogInDemoUser

      expect(actual).toStrictEqual({
        _tag: 'ForceLogInResponse',
        user: {
          name: 'Josiah Carberry',
          orcid: '0000-0002-1825-0097',
          pseudonym: 'Orange Panda',
        },
      })
    }).pipe(Effect.provideService(Locale, locale), Effect.provide(featureFlagsLayer(true)), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])("when can't log in as the demo user", locale =>
    Effect.gen(function* () {
      const actual = yield* _.LogInDemoUser

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
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
    askAiReviewEarly: shouldNotBeCalled,
    canAddMultipleAuthors: shouldNotBeCalled,
    canLogInAsDemoUser,
    canReviewDatasets: false,
    canSeeDesignTweaks: true,
    canSeeHomePageChanges: shouldNotBeCalled,
    useCrowdinInContext: false,
  })
