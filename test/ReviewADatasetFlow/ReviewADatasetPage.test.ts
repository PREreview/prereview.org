import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.js'
import * as Datasets from '../../src/Datasets/index.js'
import * as _ from '../../src/ReviewADatasetFlow/ReviewADatasetPage/index.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
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
