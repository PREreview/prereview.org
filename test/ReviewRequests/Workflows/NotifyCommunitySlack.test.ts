import { it } from '@effect/vitest'
import { Effect, Either, Layer, pipe } from 'effect'
import { describe, expect } from 'vitest'
import { CommunitySlack } from '../../../src/ExternalInteractions/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Workflows/NotifyCommunitySlack.ts'
import * as fc from '../../fc.ts'

describe('NotifyCommunitySlack', () => {
  describe('when the request can be shared', () => {
    describe('when the command can be completed', () => {
      describe('with a PREreviewer request', () => {
        it.effect.prop(
          'with a public persona',
          [
            fc.uuid(),
            fc.publishedPrereviewerReviewRequest({ persona: fc.constant('public') }),
            fc.publicPersona(),
            fc.preprint(),
            fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
          ],
          ([reviewRequestId, reviewRequest, publicPersona, preprint, response]) =>
            Effect.gen(function* () {
              const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

              expect(actual).toStrictEqual(Either.void)
            }).pipe(
              Effect.provide([
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
              ]),
            ),
        )

        it.effect.prop(
          'with a pseudonym persona',
          [
            fc.uuid(),
            fc.publishedPrereviewerReviewRequest({ persona: fc.constant('pseudonym') }),
            fc.pseudonymPersona(),
            fc.preprint(),
            fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
          ],
          ([reviewRequestId, reviewRequest, pseudonymPersona, preprint, response]) =>
            Effect.gen(function* () {
              const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

              expect(actual).toStrictEqual(Either.void)
            }).pipe(
              Effect.provide([
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
              ]),
            ),
        )
      })

      it.effect.prop(
        'with a received request',
        [
          fc.uuid(),
          fc.publishedReceivedReviewRequest(),
          fc.preprint(),
          fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
        ],
        ([reviewRequestId, reviewRequest, preprint, response]) =>
          Effect.gen(function* () {
            const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

            expect(actual).toStrictEqual(Either.void)
          }).pipe(
            Effect.provide([
              Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReviewRequest: () => Effect.succeed(response) }),
              Layer.mock(Personas.Personas, {}),
              Layer.mock(Preprints.Preprints, { getPreprint: () => Effect.succeed(preprint) }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, {
                recordReviewRequestSharedOnTheCommunitySlack: () => Effect.void,
              }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
              }),
            ]),
          ),
      )
    })

    it.effect.prop(
      "when the command can't be completed",
      [
        fc.uuid(),
        fc.publishedReviewRequest(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
        fc.preprint(),
        fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
        fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
      ],
      ([reviewRequestId, reviewRequest, publicPersona, pseudonymPersona, preprint, response, error]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

          expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
        }).pipe(
          Effect.provide([
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
          ]),
        ),
    )
  })

  it.effect.prop(
    "when the request can't be shared",
    [
      fc.uuid(),
      fc.publishedReviewRequest(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
      fc.preprint(),
      fc.anything().map(cause => new CommunitySlack.FailedToSharePreprintReviewRequest({ cause })),
    ],
    ([reviewRequestId, reviewRequest, publicPersona, pseudonymPersona, preprint, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
      }).pipe(
        Effect.provide([
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
        ]),
      ),
  )

  it.effect.prop(
    "when the preprint can't be loaded",
    [
      fc.uuid(),
      fc.publishedReviewRequest(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
      fc
        .anything()
        .chain(cause =>
          fc.constantFrom(new Preprints.PreprintIsNotFound({ cause }), new Preprints.PreprintIsUnavailable({ cause })),
        ),
    ],
    ([reviewRequestId, reviewRequest, publicPersona, pseudonymPersona, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
      }).pipe(
        Effect.provide([
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
        ]),
      ),
  )

  it.effect.prop(
    "when the persona can't be loaded",
    [
      fc.uuid(),
      fc.publishedPrereviewerReviewRequest(),
      fc.anything().map(cause => new Personas.UnableToGetPersona({ cause })),
    ],
    ([reviewRequestId, reviewRequest, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
      }).pipe(
        Effect.provide([
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
        ]),
      ),
  )

  it.effect.prop(
    "when the review request can't be loaded",
    [
      fc.uuid(),
      fc
        .anything()
        .chain(cause =>
          fc.constantFrom(new ReviewRequests.UnknownReviewRequest({ cause }), new Queries.UnableToQuery({ cause })),
        ),
    ],
    ([reviewRequestId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({})))
      }).pipe(
        Effect.provide([
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(Personas.Personas, {}),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getPublishedReviewRequest: () => error }),
        ]),
      ),
  )
})
