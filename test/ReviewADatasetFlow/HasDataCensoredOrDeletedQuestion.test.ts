import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.js'
import * as DatasetReviews from '../../src/DatasetReviews/index.js'
import * as _ from '../../src/ReviewADatasetFlow/HasDataCensoredOrDeletedQuestion/index.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
  'HasDataCensoredOrDeletedQuestion',
  (datasetReviewId, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.HasDataCensoredOrDeletedQuestion({ datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
)

test.prop([fc.uuid(), fc.urlParams(), fc.supportedLocale(), fc.user()])(
  'HasDataCensoredOrDeletedSubmission',
  (datasetReviewId, body, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.HasDataCensoredOrDeletedSubmission({ body, datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
)
