import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer, Option, Predicate } from 'effect'
import { Locale } from '../../src/Context.js'
import * as Datasets from '../../src/Datasets/index.js'
import * as _ from '../../src/ReviewADatasetFlow/ReviewADatasetPage/index.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { Doi } from '../../src/types/index.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

test.prop([fc.supportedLocale(), fc.datasetId(), fc.dataset()])('ReviewADatasetPage', locale =>
  Effect.gen(function* () {
    const actual = yield* _.ReviewADatasetPage

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: Routes.ReviewADataset,
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  }).pipe(Effect.provide(Layer.mock(Datasets.Datasets, {})), Effect.provideService(Locale, locale), EffectTest.run),
)

describe('ReviewADatasetSubmission', () => {
  test.prop([fc.supportedLocale(), fc.urlParams(fc.record({ whichDataset: fc.doi() }))])(
    'when there is a DOI',
    (locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.ReviewADatasetSubmission({ body })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide(Layer.mock(Datasets.Datasets, {})), Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.prop([
    fc.supportedLocale(),
    fc.oneof(
      fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'whichDataset'))),
      fc.urlParams(fc.record({ whichDataset: fc.string().filter(Predicate.not(Doi.isDoi)) })),
    ),
  ])("when there isn't a dataset DOI", (locale, body) =>
    Effect.gen(function* () {
      const actual = yield* _.ReviewADatasetSubmission({ body })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ReviewADataset,
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    }).pipe(Effect.provide(Layer.mock(Datasets.Datasets, {})), Effect.provideService(Locale, locale), EffectTest.run),
  )
})
