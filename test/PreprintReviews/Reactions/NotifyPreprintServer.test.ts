import { it } from '@effect/vitest'
import { Effect, Either, Layer, Option, pipe } from 'effect'
import { describe, expect, vi } from 'vitest'
import { CoarNotify } from '../../../src/ExternalApis/index.ts'
import * as FeatureFlags from '../../../src/FeatureFlags.ts'
import * as PreprintReviews from '../../../src/PreprintReviews/index.ts'
import * as _ from '../../../src/PreprintReviews/Reactions/NotifyPreprintServer.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Prereviews from '../../../src/Prereviews/index.ts'
import * as PublicUrl from '../../../src/public-url.ts'
import { Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

describe('NotifyPreprintServer', () => {
  describe('when the review can be loaded', () => {
    describe('when the message can be sent', () => {
      it.effect.prop(
        'when the feature is enabled',
        [fc.origin(), fc.integer(), fc.prereview({ preprintId: fc.coarNotifyTargetPreprintId() }), fc.uuid()],
        ([publicUrl, reviewId, review, uuid]) =>
          Effect.gen(function* () {
            const sendMessage = vi.fn<(typeof CoarNotify.CoarNotify.Service)['sendMessage']>(_ => Effect.void)

            const actual = yield* pipe(
              _.NotifyPreprintServer(reviewId),
              Effect.provide(Layer.mock(CoarNotify.CoarNotify, { sendMessage })),
              Effect.either,
            )

            expect(actual).toStrictEqual(Either.void)
            expect(sendMessage).toHaveBeenCalledWith({
              id: new URL(`urn:uuid:${uuid}`),
              '@context': ['https://www.w3.org/ns/activitystreams', 'https://coar-notify.net'],
              type: ['Announce', 'coar-notify:ReviewAction'],
              origin: {
                id: new URL(`${publicUrl.origin}/`),
                inbox: new URL(`${publicUrl.origin}/inbox`),
                type: 'Service',
              },
              target: Option.getOrThrow(Preprints.getCoarNotifyTarget(review.preprint.id)),
              context: expect.anything(),
              object: {
                id: new URL(`${publicUrl.origin}/reviews/${review.id}`),
                'ietf:cite-as': review.doi,
                type: ['Page', 'sorg:Review'],
              },
            })
          }).pipe(
            Effect.provide([
              FeatureFlags.layer({ sendCoarNotifyMessages: true }),
              Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(review) }),
              Layer.succeed(PublicUrl.PublicUrl, publicUrl),
              Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(uuid) }),
            ]),
          ),
      )

      it.effect.prop(
        'when the feature is sandboxed',
        [fc.origin(), fc.integer(), fc.prereview(), fc.uuid()],
        ([publicUrl, reviewId, review, uuid]) =>
          Effect.gen(function* () {
            const sendMessage = vi.fn<(typeof CoarNotify.CoarNotify.Service)['sendMessage']>(_ => Effect.void)

            const actual = yield* pipe(
              _.NotifyPreprintServer(reviewId),
              Effect.provide(Layer.mock(CoarNotify.CoarNotify, { sendMessage })),
              Effect.either,
            )

            expect(actual).toStrictEqual(Either.void)
            expect(sendMessage).toHaveBeenCalledWith({
              id: new URL(`urn:uuid:${uuid}`),
              '@context': ['https://www.w3.org/ns/activitystreams', 'https://coar-notify.net'],
              type: ['Announce', 'coar-notify:ReviewAction'],
              origin: {
                id: new URL(`${publicUrl.origin}/`),
                inbox: new URL(`${publicUrl.origin}/inbox`),
                type: 'Service',
              },
              target: {
                id: new URL('https://coar-notify-inbox.fly.dev'),
                inbox: new URL('https://coar-notify-inbox.fly.dev/inbox'),
                type: 'Service',
              },
              context: expect.anything(),
              object: {
                id: new URL(`${publicUrl.origin}/reviews/${review.id}`),
                'ietf:cite-as': review.doi,
                type: ['Page', 'sorg:Review'],
              },
            })
          }).pipe(
            Effect.provide([
              FeatureFlags.layer({ sendCoarNotifyMessages: 'sandbox' }),
              Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(review) }),
              Layer.succeed(PublicUrl.PublicUrl, publicUrl),
              Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(uuid) }),
            ]),
          ),
      )
    })

    it.effect.prop(
      "when the message doesn't need to be sent",
      [fc.origin(), fc.integer(), fc.prereview({ preprintId: fc.notACoarNotifyTargetPreprintId() })],
      ([publicUrl, reviewId, review]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide([
            Layer.mock(CoarNotify.CoarNotify, {}),
            FeatureFlags.layer({ sendCoarNotifyMessages: true }),
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(review) }),
            Layer.succeed(PublicUrl.PublicUrl, publicUrl),
            Layer.mock(Uuid.GenerateUuid, {}),
          ]),
        ),
    )

    it.effect.prop(
      "when the message can't be sent",
      [
        fc.origin(),
        fc.oneof(
          fc.tuple(fc.constant(true), fc.prereview({ preprintId: fc.coarNotifyTargetPreprintId() })),
          fc.tuple(fc.constant('sandbox'), fc.prereview()),
        ),
        fc.integer(),
        fc.uuid(),
        fc.anything().map(cause => new CoarNotify.UnableToSendCoarNotifyMessage({ cause })),
      ],
      ([publicUrl, [sendCoarNotifyMessages, review], reviewId, uuid, error]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

          expect(actual).toStrictEqual(Either.left(new PreprintReviews.FailedToNotifyPreprintServer({ cause: error })))
        }).pipe(
          Effect.provide([
            Layer.mock(CoarNotify.CoarNotify, { sendMessage: () => error }),
            FeatureFlags.layer({ sendCoarNotifyMessages }),
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(review) }),
            Layer.succeed(PublicUrl.PublicUrl, publicUrl),
            Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(uuid) }),
          ]),
        ),
    )
  })

  it.effect.prop(
    "when the review can't be loaded",
    [
      fc.origin(),
      fc.constantFrom(true, 'sandbox'),
      fc.integer(),
      fc.constantFrom(
        new Prereviews.PrereviewIsNotFound(),
        new Prereviews.PrereviewIsUnavailable(),
        new Prereviews.PrereviewWasRemoved(),
      ),
    ],
    ([publicUrl, sendCoarNotifyMessages, reviewId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new PreprintReviews.FailedToNotifyPreprintServer({ cause: error })))
      }).pipe(
        Effect.provide([
          Layer.mock(CoarNotify.CoarNotify, {}),
          FeatureFlags.layer({ sendCoarNotifyMessages }),
          Layer.mock(Prereviews.Prereviews, { getPrereview: () => error }),
          Layer.succeed(PublicUrl.PublicUrl, publicUrl),
          Layer.mock(Uuid.GenerateUuid, {}),
        ]),
      ),
  )

  it.effect.prop('when the feature is not enabled', [fc.origin(), fc.integer()], ([publicUrl, reviewId]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide([
        Layer.mock(CoarNotify.CoarNotify, {}),
        FeatureFlags.layer({ sendCoarNotifyMessages: false }),
        Layer.mock(Prereviews.Prereviews, {}),
        Layer.succeed(PublicUrl.PublicUrl, publicUrl),
        Layer.mock(Uuid.GenerateUuid, {}),
      ]),
    ),
  )
})
