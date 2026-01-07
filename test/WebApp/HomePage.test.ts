import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as FeatureFlags from '../../src/FeatureFlags.ts'
import * as Prereviews from '../../src/Prereviews/index.ts'
import * as ReviewRequests from '../../src/ReviewRequests/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/HomePage/index.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

test.prop([fc.supportedLocale()])('HomePage', locale =>
  Effect.gen(function* () {
    const actual = yield* _.HomePage

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: Routes.HomePage,
      current: 'home',
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  }).pipe(
    Effect.provide(
      Layer.mock(Prereviews.Prereviews, {
        getFiveMostRecent: Effect.succeed([]),
      }),
    ),
    Effect.provide(
      Layer.mock(ReviewRequests.ReviewRequests, {
        getFiveMostRecent: Effect.succeed([]),
      }),
    ),
    Effect.provide(FeatureFlags.layerDefaults),
    Effect.provideService(Locale, locale),
    EffectTest.run,
  ),
)
