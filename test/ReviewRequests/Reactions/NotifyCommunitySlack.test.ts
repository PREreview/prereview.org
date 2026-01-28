import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import { CommunitySlack } from '../../../src/ExternalInteractions/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Reactions/NotifyCommunitySlack.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('NotifyCommunitySlack', () => {
  describe('when the request can be shared', () => {
    describe('when the command can be completed', () => {
      describe('with a PREreviewer request', () => {
        test.prop([
          fc.uuid(),
          fc.publishedPrereviewerReviewRequest({ persona: fc.constant('public') }),
          fc.publicPersona(),
          fc.preprint(),
          fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
        ])('with a public persona', (reviewRequestId, reviewRequest, publicPersona, preprint, response) =>
          Effect.gen(function* () {
            const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

            expect(actual).toStrictEqual(Either.void)
          }).pipe(
            Effect.provide(
              Layer.mergeAll(
                Layer.mock(CommunitySlack.CommunitySlack, {
                  sharePreprintReviewRequest: () => Effect.succeed(response),
                }),
                Layer.mock(Personas.Personas, { getPublicPersona: () => Effect.succeed(publicPersona) }),
                Layer.mock(Preprints.Preprints, { getPreprint: () => Effect.succeed(preprint) }),
                Layer.mock(ReviewRequests.ReviewRequestCommands, {
                  recordReviewRequestSharedOnTheCommunitySlack: () => Effect.void,
                }),
                Layer.mock(ReviewRequests.ReviewRequestQueries, {
                  getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
                }),
              ),
            ),
            EffectTest.run,
          ),
        )

        test.prop([
          fc.uuid(),
          fc.publishedPrereviewerReviewRequest({ persona: fc.constant('pseudonym') }),
          fc.pseudonymPersona(),
          fc.preprint(),
          fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
        ])('with a pseudonym persona', (reviewRequestId, reviewRequest, pseudonymPersona, preprint, response) =>
          Effect.gen(function* () {
            const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

            expect(actual).toStrictEqual(Either.void)
          }).pipe(
            Effect.provide(
              Layer.mergeAll(
                Layer.mock(CommunitySlack.CommunitySlack, {
                  sharePreprintReviewRequest: () => Effect.succeed(response),
                }),
                Layer.mock(Personas.Personas, { getPseudonymPersona: () => Effect.succeed(pseudonymPersona) }),
                Layer.mock(Preprints.Preprints, { getPreprint: () => Effect.succeed(preprint) }),
                Layer.mock(ReviewRequests.ReviewRequestCommands, {
                  recordReviewRequestSharedOnTheCommunitySlack: () => Effect.void,
                }),
                Layer.mock(ReviewRequests.ReviewRequestQueries, {
                  getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
                }),
              ),
            ),
            EffectTest.run,
          ),
        )
      })

      test.prop([
        fc.uuid(),
        fc.publishedReceivedReviewRequest(),
        fc.preprint(),
        fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
      ])('with a received request', (reviewRequestId, reviewRequest, preprint, response) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReviewRequest: () => Effect.succeed(response) }),
              Layer.mock(Personas.Personas, {}),
              Layer.mock(Preprints.Preprints, { getPreprint: () => Effect.succeed(preprint) }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, {
                recordReviewRequestSharedOnTheCommunitySlack: () => Effect.void,
              }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
              }),
            ),
          ),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc.publishedReviewRequest(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
      fc.preprint(),
      fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
      fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
    ])(
      "when the command can't be completed",
      (reviewRequestId, reviewRequest, publicPersona, pseudonymPersona, preprint, response, error) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

          expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReviewRequest: () => Effect.succeed(response) }),
              Layer.mock(Personas.Personas, {
                getPublicPersona: () => Effect.succeed(publicPersona),
                getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
              }),
              Layer.mock(Preprints.Preprints, { getPreprint: () => Effect.succeed(preprint) }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, {
                recordReviewRequestSharedOnTheCommunitySlack: () => error,
              }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
              }),
            ),
          ),
          EffectTest.run,
        ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.publishedReviewRequest(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
    fc.preprint(),
    fc.anything().map(cause => new CommunitySlack.FailedToSharePreprintReviewRequest({ cause })),
  ])(
    "when the request can't be shared",
    (reviewRequestId, reviewRequest, publicPersona, pseudonymPersona, preprint, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReviewRequest: () => error }),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
            Layer.mock(Preprints.Preprints, { getPreprint: () => Effect.succeed(preprint) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.publishedReviewRequest(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(new Preprints.PreprintIsNotFound({ cause }), new Preprints.PreprintIsUnavailable({ cause })),
      ),
  ])("when the preprint can't be loaded", (reviewRequestId, reviewRequest, publicPersona, pseudonymPersona, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
          Layer.mock(Preprints.Preprints, { getPreprint: () => error }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.publishedPrereviewerReviewRequest(),
    fc.anything().map(cause => new Personas.UnableToGetPersona({ cause })),
  ])("when the persona can't be loaded", (reviewRequestId, reviewRequest, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => error,
            getPseudonymPersona: () => error,
          }),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(
          new ReviewRequests.UnknownReviewRequest({ cause }),
          new ReviewRequests.UnableToQuery({ cause }),
        ),
      ),
  ])("when the review request can't be loaded", (reviewRequestId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(Personas.Personas, {}),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getPublishedReviewRequest: () => error }),
        ),
      ),
      EffectTest.run,
    ),
  )
})
