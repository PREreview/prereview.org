import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../../src/Context.js'
import * as _ from '../../src/ReviewADatasetFlow/HasTrackedChangesQuestion/index.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

test.prop([fc.uuid(), fc.supportedLocale()])('HasTrackedChangesQuestion', (datasetReviewId, locale) =>
  Effect.gen(function* () {
    const actual = yield* _.HasTrackedChangesQuestion({ datasetReviewId })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
)

test.prop([fc.uuid(), fc.urlParams(), fc.supportedLocale()])(
  'HasTrackedChangesSubmission',
  (datasetReviewId, body, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.HasTrackedChangesSubmission({ datasetReviewId, body })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
)
