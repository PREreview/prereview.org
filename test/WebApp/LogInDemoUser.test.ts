import { it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { describe, expect } from 'vitest'
import { Locale } from '../../src/Context.ts'
import * as FeatureFlags from '../../src/FeatureFlags.ts'
import { Prereviewers } from '../../src/Prereviewers/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/LogInDemoUser.ts'
import * as fc from '../fc.ts'

describe('LogInDemoUser', () => {
  it.effect.prop('when can log in as the demo user', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.LogInDemoUser

      expect(actual).toStrictEqual({
        _tag: 'ForceLogInResponse',
        user: { orcid: '0000-0002-1825-0097' },
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provide(FeatureFlags.layer({ canLogInAsDemoUser: true })),
      Effect.provide(Layer.mock(Prereviewers, { isRegistered: () => Effect.succeed(true) })),
    ),
  )

  it.effect.prop("when can't log in as the demo user", [fc.supportedLocale()], ([locale]) =>
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
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provide(FeatureFlags.layer({ canLogInAsDemoUser: false })),
      Effect.provide(Layer.mock(Prereviewers, {})),
    ),
  )
})
