import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Layer, Option } from 'effect'
import * as Commands from '../../../src/Commands.ts'
import { Locale } from '../../../src/Context.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/ChooseYourPersonaPage/index.ts'
import { RouteForCommand } from '../../../src/WebApp/RequestAReviewFlow/RouteForCommand.ts'
import * as Routes from '../../../src/routes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('ChooseYourPersonaPage', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.record({
          reviewRequestId: fc.uuid(),
          personaChoice: fc.maybe(fc.constantFrom('public', 'pseudonym')),
        }),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.supportedLocale(),
      ])('when the form needs submitting', async (preprintId, user, reviewRequest, preprintTitle, locale) =>
        Effect.gen(function* () {
          const getPersonaChoice = jest.fn<(typeof ReviewRequests.ReviewRequestQueries.Service)['getPersonaChoice']>(
            _ => Effect.succeed(reviewRequest),
          )
          const getPreprintTitle = jest.fn<(typeof Preprints.Preprints.Service)['getPreprintTitle']>(_ =>
            Effect.succeed(preprintTitle),
          )

          const actual = yield* Effect.provide(_.ChooseYourPersonaPage({ preprintId }), [
            Layer.mock(Preprints.Preprints, { getPreprintTitle }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { getPersonaChoice }),
          ])

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.RequestAReviewChooseYourPersona.href({ preprintId: preprintTitle.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: [],
          })
          expect(getPersonaChoice).toHaveBeenCalledWith({ requesterId: user.orcid, preprintId: preprintTitle.id })
          expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          ]),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])('when the request is already complete', async (preprintId, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaPage({ preprintId })

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
            getPersonaChoice: () => new ReviewRequests.ReviewRequestHasBeenPublished({}),
          }),
        ]),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.supportedLocale(),
    ])("when a request hasn't been started", async (preprintId, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaPage({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPersonaChoice: () => new ReviewRequests.UnknownReviewRequest({}),
          }),
        ]),
        EffectTest.run,
      ),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.preprintTitle({ id: fc.preprintId() }), fc.supportedLocale()])(
    'when the request cannot be loaded',
    async (preprintId, user, preprintTitle, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaPage({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getPersonaChoice: () => new Queries.UnableToQuery({}) }),
        ]),
        EffectTest.run,
      ),
  )

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, user, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaPage({ preprintId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Preprints.Preprints, {
            getPreprintTitle: () => new Preprints.PreprintIsUnavailable({}),
          }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
        ]),
        EffectTest.run,
      ),
  )

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (preprintId, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaPage({ preprintId })

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
        EffectTest.run,
      ),
  )
})

describe('ChooseYourPersonaSubmission', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.record({
          reviewRequestId: fc.uuid(),
          personaChoice: fc.maybe(fc.constantFrom('public', 'pseudonym')),
        }),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.record({ chooseYourPersona: fc.constantFrom('public', 'pseudonym') }),
        fc.supportedLocale(),
        fc.reviewRequestNextExpectedCommand(),
      ])(
        'when the persona is set',
        async (preprintId, user, reviewRequest, preprintTitle, body, locale, nextExpectedCommand) =>
          Effect.gen(function* () {
            const getPersonaChoice = jest.fn<(typeof ReviewRequests.ReviewRequestQueries.Service)['getPersonaChoice']>(
              _ => Effect.succeed(reviewRequest),
            )
            const getNextExpectedCommandForAUserOnAReviewRequest = jest.fn<
              (typeof ReviewRequests.ReviewRequestQueries.Service)['getNextExpectedCommandForAUserOnAReviewRequest']
            >(_ => Effect.succeed(nextExpectedCommand))
            const getPreprintTitle = jest.fn<(typeof Preprints.Preprints.Service)['getPreprintTitle']>(_ =>
              Effect.succeed(preprintTitle),
            )
            const choosePersona = jest.fn<(typeof ReviewRequests.ReviewRequestCommands.Service)['choosePersona']>(
              _ => Effect.void,
            )

            const actual = yield* Effect.provide(
              _.ChooseYourPersonaSubmission({ body: UrlParams.fromInput(body), preprintId }),
              [
                Layer.mock(Preprints.Preprints, { getPreprintTitle }),
                Layer.mock(ReviewRequests.ReviewRequestQueries, {
                  getPersonaChoice,
                  getNextExpectedCommandForAUserOnAReviewRequest,
                }),
                Layer.mock(ReviewRequests.ReviewRequestCommands, { choosePersona }),
              ],
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: RouteForCommand(nextExpectedCommand).href({ preprintId: preprintTitle.id }),
            })
            expect(getPersonaChoice).toHaveBeenCalledWith({ requesterId: user.orcid, preprintId: preprintTitle.id })
            expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
            expect(choosePersona).toHaveBeenCalledWith({
              persona: body.chooseYourPersona,
              reviewRequestId: reviewRequest.reviewRequestId,
            })
            expect(getNextExpectedCommandForAUserOnAReviewRequest).toHaveBeenCalledWith({
              reviewRequestId: reviewRequest.reviewRequestId,
            })
          }).pipe(Effect.provide([Layer.succeed(Locale, locale), Layer.succeed(LoggedInUser, user)]), EffectTest.run),
      )

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.record({
          reviewRequestId: fc.uuid(),
          personaChoice: fc.maybe(fc.constantFrom('public', 'pseudonym')),
        }),
        fc.preprintTitle(),
        fc.urlParams(fc.record({ chooseYourPersona: fc.constantFrom('public', 'pseudonym') })),
        fc.supportedLocale(),
        fc.anything().map(cause => new Commands.UnableToHandleCommand({ cause })),
      ])("when the persona can't be set", async (preprintId, user, reviewRequest, preprintTitle, body, locale, error) =>
        Effect.gen(function* () {
          const actual = yield* _.ChooseYourPersonaSubmission({ body, preprintId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, { choosePersona: () => error }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getPersonaChoice: () => Effect.succeed(reviewRequest),
            }),
          ]),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.record({
          reviewRequestId: fc.uuid(),
          personaChoice: fc.maybe(fc.constantFrom('public', 'pseudonym')),
        }),
        fc.preprintTitle({ id: fc.preprintId() }),
        fc.oneof(
          fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'chooseYourPersona'))),
          fc.urlParams(
            fc.record({
              chooseYourPersona: fc.string().filter(string => !['public', 'pseudonym'].includes(string)),
            }),
          ),
        ),
        fc.supportedLocale(),
      ])('when the form is invalid', async (preprintId, user, reviewRequest, preprintTitle, body, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.ChooseYourPersonaSubmission({ body, preprintId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.RequestAReviewChooseYourPersona.href({ preprintId: preprintTitle.id }),
            status: StatusCodes.BadRequest,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['error-summary.js'],
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
            Layer.mock(ReviewRequests.ReviewRequestQueries, { getPersonaChoice: () => Effect.succeed(reviewRequest) }),
          ]),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.urlParams(),
      fc.supportedLocale(),
    ])('when the request is already complete', async (preprintId, user, preprintTitle, body, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaSubmission({ body, preprintId })

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
            getPersonaChoice: () => new ReviewRequests.ReviewRequestHasBeenPublished({}),
          }),
        ]),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.preprintId() }),
      fc.urlParams(),
      fc.supportedLocale(),
    ])("when a request hasn't been started", async (preprintId, user, preprintTitle, body, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaSubmission({ body, preprintId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPersonaChoice: () => new ReviewRequests.UnknownReviewRequest({}),
          }),
        ]),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.user(),
    fc.preprintTitle({ id: fc.preprintId() }),
    fc.urlParams(),
    fc.supportedLocale(),
  ])('when the request cannot be loaded', async (preprintId, user, preprintTitle, body, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.ChooseYourPersonaSubmission({ body, preprintId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide([
        Layer.succeed(Locale, locale),
        Layer.succeed(LoggedInUser, user),
        Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprintTitle) }),
        Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
        Layer.mock(ReviewRequests.ReviewRequestQueries, { getPersonaChoice: () => new Queries.UnableToQuery({}) }),
      ]),
      EffectTest.run,
    ),
  )

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.urlParams(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, user, body, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaSubmission({ body, preprintId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => new Preprints.PreprintIsUnavailable({}) }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
        ]),
        EffectTest.run,
      ),
  )

  test.prop([fc.indeterminatePreprintId(), fc.urlParams(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (preprintId, body, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChooseYourPersonaSubmission({ body, preprintId })

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
        EffectTest.run,
      ),
  )
})
