import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import { Status } from 'hyper-ts'
import { Locale } from '../src/Context.js'
import * as _ from '../src/DatasetReviewPage/index.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

test.prop([fc.supportedLocale(), fc.uuid()])('DatasetReviewPage', (locale, datasetReviewId) =>
  Effect.gen(function* () {
    const actual = yield* _.DatasetReviewPage({ datasetReviewId })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
)
