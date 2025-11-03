import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Reactions/NotifyCommunitySlack.ts'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import { PublicUrl } from '../../../src/public-url.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('NotifyCommunitySlack', () => {
  describe('when the Slack can be notified', () => {
    test.prop([
      fc.uuid(),
      fc.origin(),
      fc.publishedDatasetReview({ author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('public') }) }),
      fc.publicPersona(),
    ])('using a public persona', (datasetReviewId, publicUrl, publishedReview, publicPersona) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getPublishedReview: () => Effect.succeed(publishedReview),
            }),
            Layer.mock(Slack.Slack, { chatPostMessage: () => Effect.void }),
            Layer.mock(Personas.Personas, { getPublicPersona: () => Effect.succeed(publicPersona) }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
    )
    test.prop([
      fc.uuid(),
      fc.origin(),
      fc.publishedDatasetReview({ author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('pseudonym') }) }),
      fc.pseudonymPersona(),
    ])('using a pseudonym persona', (datasetReviewId, publicUrl, publishedReview, pseudonymPersona) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getPublishedReview: () => Effect.succeed(publishedReview),
            }),
            Layer.mock(Slack.Slack, { chatPostMessage: () => Effect.void }),
            Layer.mock(Personas.Personas, { getPseudonymPersona: () => Effect.succeed(pseudonymPersona) }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.origin(),
    fc.publishedDatasetReview(),
    fc.oneof(fc.httpClientError()),
    fc.publicPersona(),
    fc.pseudonymPersona(),
  ])(
    "when the Slack can't be notified",
    (datasetReviewId, publicUrl, publishedReview, error, publicPersona, pseudonymPersona) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToNotifyCommunitySlack({})))
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getPublishedReview: () => Effect.succeed(publishedReview),
            }),
            Layer.mock(Slack.Slack, { chatPostMessage: () => error }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.origin(), fc.publishedDatasetReview(), fc.anything()])(
    "when the persona can't be loaded",
    (datasetReviewId, publicUrl, publishedReview, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToNotifyCommunitySlack({})))
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getPublishedReview: () => Effect.succeed(publishedReview),
            }),
            Layer.mock(Slack.Slack, {}),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => new Personas.UnableToGetPersona({ cause: error }),
              getPseudonymPersona: () => new Personas.UnableToGetPersona({ cause: error }),
            }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.origin(),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(
          new DatasetReviews.DatasetReviewHasNotBeenPublished({ cause }),
          new DatasetReviews.UnableToQuery({ cause }),
          new DatasetReviews.UnknownDatasetReview({ cause }),
        ),
      ),
  ])("when the published review can't be loaded", (datasetReviewId, publicUrl, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToNotifyCommunitySlack({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getPublishedReview: () => error,
          }),
          Layer.mock(Slack.Slack, {}),
          Layer.mock(Personas.Personas, {}),
          Layer.succeed(PublicUrl, publicUrl),
        ),
      ),
      EffectTest.run,
    ),
  )
})
