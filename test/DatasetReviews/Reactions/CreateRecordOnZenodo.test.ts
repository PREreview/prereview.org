import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Either, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as _ from '../../../src/DatasetReviews/Reactions/CreateRecordOnZenodo.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../../fc.js'

test.prop([fc.uuid()])('CreateRecordOnZenodo', datasetReviewId =>
  Effect.gen(function* () {
    const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
  }).pipe(EffectTest.run),
)
