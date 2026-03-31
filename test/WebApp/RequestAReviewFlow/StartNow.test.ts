import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer } from 'effect'
import * as Commands from '../../../src/Commands.ts'
import { Locale } from '../../../src/Context.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/StartNow/index.ts'
import * as Routes from '../../../src/routes.ts'
import { Uuid } from '../../../src/types/index.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('requestReviewStart', () => {
  describe('when the user is logged in', () => {
    describe("when a request hasn't been started", () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
        fc.uuid(),
      ])('when a request can be started', (preprintId, user, preprintTitle, locale, uuid) =>
        Effect.gen(function* () {
          const findReviewRequestByAPrereviewer = jest.fn<
            (typeof ReviewRequests.ReviewRequestQueries.Service)['findReviewRequestByAPrereviewer']
          >(_ => Effect.succeedNone)

          const actual = yield* Effect.provide(
            _.StartNow({ preprintId }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { findReviewRequestByAPrereviewer }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprintTitle.id }),
          })
          expect(findReviewRequestByAPrereviewer).toHaveBeenCalledWith({
            requesterId: user.orcid,
            preprintId: preprintTitle.id,
          })
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, { startReviewRequest: () => Effect.void }),
              Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(uuid) }),
            ),
          ),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
        fc.uuid(),
        fc
          .anything()
          .chain(cause =>
            fc.constantFrom(
              new Commands.UnableToHandleCommand({ cause }),
              new ReviewRequests.ReviewRequestWasAlreadyStarted({ cause }),
            ),
          ),
      ])("when a request can't be started", (preprintId, user, preprintTitle, locale, uuid, error) =>
        Effect.gen(function* () {
          const actual = yield* _.StartNow({ preprintId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, { startReviewRequest: () => error }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                findReviewRequestByAPrereviewer: () => Effect.succeedNone,
              }),
              Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(uuid) }),
            ),
          ),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.record({ _tag: fc.constant('PublishedReviewRequest'), id: fc.uuid() }),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])('when a request has already been completed', (preprintId, user, reviewRequest, preprintTitle, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: Routes.RequestAReviewPublished.href({ preprintId: preprintTitle.id }),
        })
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              findReviewRequestByAPrereviewer: () => Effect.succeedSome(reviewRequest),
            }),
            Layer.mock(Uuid.GenerateUuid, {}),
          ),
        ),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.record({ _tag: fc.constantFrom('ReviewRequestPendingPublication'), id: fc.uuid() }),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])('when a request has already been started', (preprintId, user, reviewRequest, preprintTitle, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.RequestAReviewStartNow.href({ preprintId: preprintTitle.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              findReviewRequestByAPrereviewer: () => Effect.succeedSome(reviewRequest),
            }),
            Layer.mock(Uuid.GenerateUuid, {}),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'when the user is not logged in',
    (preprintId, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.StartNow({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.RequestAReviewStartNow.href({ preprintId }),
        })
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.succeed(Locale, locale),
            Layer.mock(Preprints.Preprints, {}),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
            Layer.mock(Uuid.GenerateUuid, {}),
          ),
        ),
        EffectTest.run,
      ),
  )
})
