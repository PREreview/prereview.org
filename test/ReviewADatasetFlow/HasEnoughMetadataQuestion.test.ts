import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../../src/Context.js'
import * as _ from '../../src/ReviewADatasetFlow/HasEnoughMetadataQuestion/index.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

test.prop([fc.uuid(), fc.supportedLocale()])('HasEnoughMetadataQuestion', (datasetReviewId, locale) =>
  Effect.gen(function* () {
    const actual = yield* _.HasEnoughMetadataQuestion({ datasetReviewId })

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
  'HasEnoughMetadataSubmission',
  (datasetReviewId, body, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.HasEnoughMetadataSubmission({ datasetReviewId, body })

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
