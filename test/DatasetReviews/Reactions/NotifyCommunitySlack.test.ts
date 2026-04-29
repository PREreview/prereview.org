import { describe, expect, it } from '@effect/vitest'
import { Effect, Either, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Reactions/NotifyCommunitySlack.ts'
import { CommunitySlack } from '../../../src/ExternalInteractions/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import { PublicUrl } from '../../../src/public-url.ts'
import * as Queries from '../../../src/Queries.ts'
import * as fc from '../../fc.ts'

describe('NotifyCommunitySlack', () => {
  describe('when the Slack can be notified', () => {
    it.effect.prop(
      'using a public persona',
      [
        fc.uuid(),
        fc.origin(),
        fc.publishedDatasetReview({ author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('public') }) }),
        fc.publicPersona(),
      ],
      ([datasetReviewId, publicUrl, publishedReview, publicPersona]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide([
            Layer.mock(CommunitySlack.CommunitySlack, { shareDatasetReview: () => Effect.void }),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getPublishedReview: () => Effect.succeed(publishedReview),
            }),
            Layer.mock(Personas.Personas, { getPublicPersona: () => Effect.succeed(publicPersona) }),
            Layer.succeed(PublicUrl, publicUrl),
          ]),
        ),
    )

    it.effect.prop(
      'using a pseudonym persona',
      [
        fc.uuid(),
        fc.origin(),
        fc.publishedDatasetReview({ author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('pseudonym') }) }),
        fc.pseudonymPersona(),
      ],
      ([datasetReviewId, publicUrl, publishedReview, pseudonymPersona]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide([
            Layer.mock(CommunitySlack.CommunitySlack, { shareDatasetReview: () => Effect.void }),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getPublishedReview: () => Effect.succeed(publishedReview),
            }),
            Layer.mock(Personas.Personas, { getPseudonymPersona: () => Effect.succeed(pseudonymPersona) }),
            Layer.succeed(PublicUrl, publicUrl),
          ]),
        ),
    )
  })

  it.effect.prop(
    "when the Slack can't be notified",
    [
      fc.uuid(),
      fc.origin(),
      fc.publishedDatasetReview(),
      fc.anything().map(cause => new CommunitySlack.FailedToShareDatasetReview({ cause })),
      fc.publicPersona(),
      fc.pseudonymPersona(),
    ],
    ([datasetReviewId, publicUrl, publishedReview, error, publicPersona, pseudonymPersona]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToNotifyCommunitySlack({})))
      }).pipe(
        Effect.provide([
          Layer.mock(CommunitySlack.CommunitySlack, { shareDatasetReview: () => error }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getPublishedReview: () => Effect.succeed(publishedReview),
          }),
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
          Layer.succeed(PublicUrl, publicUrl),
        ]),
      ),
  )

  it.effect.prop(
    "when the persona can't be loaded",
    [fc.uuid(), fc.origin(), fc.publishedDatasetReview(), fc.anything()],
    ([datasetReviewId, publicUrl, publishedReview, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToNotifyCommunitySlack({})))
      }).pipe(
        Effect.provide([
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getPublishedReview: () => Effect.succeed(publishedReview),
          }),
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => new Personas.UnableToGetPersona({ cause: error }),
            getPseudonymPersona: () => new Personas.UnableToGetPersona({ cause: error }),
          }),
          Layer.succeed(PublicUrl, publicUrl),
        ]),
      ),
  )

  it.effect.prop(
    "when the published review can't be loaded",
    [
      fc.uuid(),
      fc.origin(),
      fc
        .anything()
        .chain(cause =>
          fc.constantFrom(
            new DatasetReviews.DatasetReviewHasNotBeenPublished({ cause }),
            new Queries.UnableToQuery({ cause }),
            new DatasetReviews.UnknownDatasetReview({ cause }),
          ),
        ),
    ],
    ([datasetReviewId, publicUrl, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToNotifyCommunitySlack({})))
      }).pipe(
        Effect.provide([
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getPublishedReview: () => error,
          }),
          Layer.mock(Personas.Personas, {}),
          Layer.succeed(PublicUrl, publicUrl),
        ]),
      ),
  )
})
