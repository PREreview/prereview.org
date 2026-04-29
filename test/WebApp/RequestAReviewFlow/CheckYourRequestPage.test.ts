import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, Tuple } from 'effect'
import * as Commands from '../../../src/Commands.ts'
import { Locale } from '../../../src/Context.ts'
import * as Personas from '../../../src/Personas/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { Temporal } from '../../../src/types/index.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/CheckYourRequestPage/index.ts'
import { RedirectResponse } from '../../../src/WebApp/Response/index.ts'
import * as fc from '../../fc.ts'

describe('CheckYourRequestPage', () => {
  describe('when the user is logged in', () => {
    it.effect.prop(
      'when there is a incomplete request',
      [
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
        fc.record({ personaChoice: fc.constantFrom('public', 'pseudonym'), reviewRequestId: fc.uuid() }),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
      ],
      ([preprintId, user, publicPersona, pseudonymPersona, reviewRequest, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const getPreprintTitle = vi.fn<(typeof Preprints.Preprints.Service)['getPreprintTitle']>(_ =>
            Effect.succeed(preprintTitle),
          )

          const actual = yield* Effect.provide(
            _.CheckYourRequestPage({ preprintId }),
            Layer.mock(Preprints.Preprints, { getPreprintTitle }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.RequestAReviewCheckYourRequest.href({ preprintId: preprintTitle.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['single-use-form.js'],
          })
          expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(
              Personas.Personas,
              reviewRequest.personaChoice === 'public'
                ? { getPublicPersona: () => Effect.succeed(publicPersona) }
                : { getPseudonymPersona: () => Effect.succeed(pseudonymPersona) },
            ),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestReadyToBePublished: () => Effect.succeed(reviewRequest),
            }),
          ]),
        ),
    )

    it.effect.prop(
      'when the request is already complete',
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourRequestPage({ preprintId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.RequestAReviewPublished.href({ preprintId }),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Personas.Personas, {}),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestReadyToBePublished: () => new ReviewRequests.ReviewRequestHasBeenPublished({}),
            }),
          ]),
        ),
    )

    it.effect.prop(
      "when the review request isn't ready to be published",
      [
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
        fc.constantFrom<
          Array<
            [
              ReviewRequests.ReviewRequestNotReadyToBePublished['missing'],
              Routes.Route<{ preprintId: Preprints.IndeterminatePreprintId }>,
            ]
          >
        >(Tuple.make(['PersonaForAReviewRequestForAPreprintWasChosen'], Routes.RequestAReviewChooseYourPersona)),
      ],
      ([preprintId, user, preprintTitle, locale, [missing, expected]]) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourRequestPage({ preprintId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: expected.href({ preprintId }),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Personas.Personas, {}),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestReadyToBePublished: () =>
                new ReviewRequests.ReviewRequestNotReadyToBePublished({ missing }),
            }),
          ]),
        ),
    )

    it.effect.prop(
      "when a request hasn't been started",
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const getReviewRequestReadyToBePublished = vi.fn<
            (typeof ReviewRequests.ReviewRequestQueries.Service)['getReviewRequestReadyToBePublished']
          >(_ => new ReviewRequests.UnknownReviewRequest({}))

          const actual = yield* Effect.provide(
            _.CheckYourRequestPage({ preprintId }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestReadyToBePublished }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getReviewRequestReadyToBePublished).toHaveBeenCalledWith({
            requesterId: user.orcid,
            preprintId: preprintTitle.id,
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Personas.Personas, {}),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          ]),
        ),
    )

    it.effect.prop(
      "when the request can't be loaded",
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const getReviewRequestReadyToBePublished = vi.fn<
            (typeof ReviewRequests.ReviewRequestQueries.Service)['getReviewRequestReadyToBePublished']
          >(_ => new Queries.UnableToQuery({}))

          const actual = yield* Effect.provide(
            _.CheckYourRequestPage({ preprintId }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestReadyToBePublished }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getReviewRequestReadyToBePublished).toHaveBeenCalledWith({
            requesterId: user.orcid,
            preprintId: preprintTitle.id,
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Personas.Personas, {}),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          ]),
        ),
    )
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.indeterminatePreprintId(), fc.supportedLocale()],
    ([preprintId, locale]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourRequestPage({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }),
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.mock(Personas.Personas, {}),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
        ]),
      ),
  )
})

describe('CheckYourRequestSubmission', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      it.effect.prop(
        'when the request can be published',
        [
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.record({ personaChoice: fc.constantFrom('public', 'pseudonym'), reviewRequestId: fc.uuid() }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
        ],
        ([preprintId, user, reviewRequest, preprintTitle, locale]) =>
          Effect.gen(function* () {
            const publishReviewRequest = vi.fn<
              (typeof ReviewRequests.ReviewRequestCommands.Service)['publishReviewRequest']
            >(_ => Effect.void)

            const actual = yield* Effect.provide(
              _.CheckYourRequestSubmission({ preprintId }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, { publishReviewRequest }),
            )

            expect(actual).toStrictEqual(
              RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId: preprintTitle.id }) }),
            )
            expect(publishReviewRequest).toHaveBeenCalledWith({
              publishedAt: yield* Temporal.currentInstant,
              reviewRequestId: reviewRequest.reviewRequestId,
            })
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getReviewRequestReadyToBePublished: () => Effect.succeed(reviewRequest),
              }),
            ]),
          ),
      )

      it.effect.prop(
        "when the request can't be published",
        [
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.record({ personaChoice: fc.constantFrom('public', 'pseudonym'), reviewRequestId: fc.uuid() }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
        ],
        ([preprintId, user, reviewRequest, preprintTitle, locale]) =>
          Effect.gen(function* () {
            const publishReviewRequest = vi.fn<
              (typeof ReviewRequests.ReviewRequestCommands.Service)['publishReviewRequest']
            >(_ => new Commands.UnableToHandleCommand({}))

            const actual = yield* Effect.provide(
              _.CheckYourRequestSubmission({ preprintId }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, { publishReviewRequest }),
            )

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
            expect(publishReviewRequest).toHaveBeenCalledWith({
              publishedAt: yield* Temporal.currentInstant,
              reviewRequestId: reviewRequest.reviewRequestId,
            })
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getReviewRequestReadyToBePublished: () => Effect.succeed(reviewRequest),
              }),
            ]),
          ),
      )

      it.effect.prop(
        'when the request can not be published',
        [
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.record({ personaChoice: fc.constantFrom('public', 'pseudonym'), reviewRequestId: fc.uuid() }),
          fc.preprintTitle({ id: fc.preprintId() }),
          fc.supportedLocale(),
          fc.anything().map(cause => new Commands.UnableToHandleCommand({ cause })),
        ],
        ([preprintId, user, reviewRequest, preprintTitle, locale, error]) =>
          Effect.gen(function* () {
            const publishReviewRequest = vi.fn<
              (typeof ReviewRequests.ReviewRequestCommands.Service)['publishReviewRequest']
            >(_ => error)

            const actual = yield* Effect.provide(
              _.CheckYourRequestSubmission({ preprintId }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, { publishReviewRequest }),
            )

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
            expect(publishReviewRequest).toHaveBeenCalledWith({
              publishedAt: yield* Temporal.currentInstant,
              reviewRequestId: reviewRequest.reviewRequestId,
            })
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getReviewRequestReadyToBePublished: () => Effect.succeed(reviewRequest),
              }),
            ]),
          ),
      )
    })

    it.effect.prop(
      'when the request is already complete',
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourRequestSubmission({ preprintId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.RequestAReviewPublished.href({ preprintId }),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestReadyToBePublished: () => new ReviewRequests.ReviewRequestHasBeenPublished({}),
            }),
          ]),
        ),
    )

    it.effect.prop(
      "when a name hasn't been chosen",
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CheckYourRequestSubmission({ preprintId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.RequestAReviewChooseYourPersona.href({ preprintId }),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestReadyToBePublished: () =>
                new ReviewRequests.ReviewRequestNotReadyToBePublished({
                  missing: ['PersonaForAReviewRequestForAPreprintWasChosen'],
                }),
            }),
          ]),
        ),
    )

    it.effect.prop(
      "when a request hasn't been started",
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const getReviewRequestReadyToBePublished = vi.fn<
            (typeof ReviewRequests.ReviewRequestQueries.Service)['getReviewRequestReadyToBePublished']
          >(_ => new ReviewRequests.UnknownReviewRequest({}))

          const actual = yield* Effect.provide(
            _.CheckYourRequestSubmission({ preprintId }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestReadyToBePublished }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getReviewRequestReadyToBePublished).toHaveBeenCalledWith({
            requesterId: user.orcid,
            preprintId: preprintTitle.id,
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          ]),
        ),
    )

    it.effect.prop(
      "when the request can't be loaded",
      [fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()],
      ([preprintId, user, preprintTitle, locale]) =>
        Effect.gen(function* () {
          const getReviewRequestReadyToBePublished = vi.fn<
            (typeof ReviewRequests.ReviewRequestQueries.Service)['getReviewRequestReadyToBePublished']
          >(_ => new Queries.UnableToQuery({}))

          const actual = yield* Effect.provide(
            _.CheckYourRequestSubmission({ preprintId }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestReadyToBePublished }),
          )

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(getReviewRequestReadyToBePublished).toHaveBeenCalledWith({
            requesterId: user.orcid,
            preprintId: preprintTitle.id,
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          ]),
        ),
    )
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.indeterminatePreprintId(), fc.supportedLocale()],
    ([preprintId, locale]) =>
      Effect.gen(function* () {
        const actual = yield* _.CheckYourRequestSubmission({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }),
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
        ]),
      ),
  )
})
