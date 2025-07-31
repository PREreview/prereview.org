import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Either, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as _ from '../../../src/DatasetReviews/Reactions/UseZenodoRecordDoi.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../../fc.js'

test.prop([fc.uuid(), fc.integer()])('UseZenodoRecordDoi', (datasetReviewId, recordId) =>
  Effect.gen(function* () {
    const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, recordId), Effect.either)

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToUseZenodoDoi({})))
  }).pipe(EffectTest.run),
)
