import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as _ from '../../src/ReviewADatasetFlow/ReviewThisDatasetPage/index.js'
import * as Routes from '../../src/routes.js'
import * as EffectTest from '../EffectTest.js'

test('ReviewThisDatasetPage', () =>
  Effect.gen(function* () {
    const actual = yield* _.ReviewThisDatasetPage

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: Routes.ReviewThisDataset,
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  }).pipe(EffectTest.run))
