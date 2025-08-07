import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import * as _ from '../src/DatasetReviewsPage/index.js'
import * as Routes from '../src/routes.js'
import * as EffectTest from './EffectTest.js'

test('DatasetReviewsPage', () =>
  Effect.gen(function* () {
    const actual = yield* _.DatasetReviewsPage

    expect(actual).toStrictEqual({
      _tag: 'TwoUpPageResponse',
      canonical: Routes.DatasetReviews,
      title: expect.anything(),
      description: expect.anything(),
      h1: expect.anything(),
      aside: expect.anything(),
      main: expect.anything(),
      type: 'dataset',
    })
  }).pipe(EffectTest.run))
