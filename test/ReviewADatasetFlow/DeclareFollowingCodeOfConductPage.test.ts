import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as _ from '../../src/ReviewADatasetFlow/DeclareFollowingCodeOfConductPage/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

test.prop([fc.uuid(), fc.supportedLocale()])('DeclareFollowingCodeOfConductPage', (datasetReviewId, locale) =>
  Effect.gen(function* () {
    const actual = yield* _.DeclareFollowingCodeOfConductPage({ datasetReviewId })

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

test.prop([
  fc.uuid(),
  fc.urlParams(fc.record({ chooseYourPersona: fc.constantFrom('public', 'pseudonym') })),
  fc.supportedLocale(),
])('DeclareFollowingCodeOfConductSubmission', (datasetReviewId, body, locale) =>
  Effect.gen(function* () {
    const actual = yield* _.DeclareFollowingCodeOfConductSubmission({ body, datasetReviewId })

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
