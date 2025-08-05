import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Effect, Either, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as _ from '../../../src/DatasetReviews/Reactions/PublishRecordOnZenodo.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../../fc.js'

test.prop([fc.uuid()])('PublishRecordOnZenodo', datasetReviewId =>
  Effect.gen(function* () {
    const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
  }).pipe(EffectTest.run),
)
