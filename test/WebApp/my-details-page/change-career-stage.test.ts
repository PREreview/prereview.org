import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeCareerStageMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-career-stage.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeCareerStage', () => {
  it.effect.prop(
    'when there is a logged in user',
    [
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.careerStage()),
    ],
    ([body, method, user, locale, careerStage]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeCareerStage({ body, locale, method, user })({
            deleteCareerStage: shouldNotBeCalled,
            getCareerStage: () => TE.fromEither(careerStage),
            saveCareerStage: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeCareerStageMatch.formatter, {}),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }),
  )

  describe('when the form has been submitted', () => {
    it.effect.prop(
      'there is a career stage already',
      [fc.careerStageValue(), fc.user(), fc.supportedLocale(), fc.careerStage()],
      ([careerStage, user, locale, existingCareerStage]) =>
        Effect.gen(function* () {
          const saveCareerStage = vi.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeCareerStage({ body: { careerStage }, locale, method: 'POST', user })({
              deleteCareerStage: shouldNotBeCalled,
              getCareerStage: () => TE.right(existingCareerStage),
              saveCareerStage,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, {
            value: careerStage,
            visibility: existingCareerStage.visibility,
          })
        }),
    )

    it.effect.prop(
      "when there isn't a career stage already",
      [fc.careerStageValue(), fc.user(), fc.supportedLocale()],
      ([careerStage, user, locale]) =>
        Effect.gen(function* () {
          const saveCareerStage = vi.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeCareerStage({ body: { careerStage }, locale, method: 'POST', user })({
              deleteCareerStage: shouldNotBeCalled,
              getCareerStage: () => TE.left('not-found'),
              saveCareerStage,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, { value: careerStage, visibility: 'restricted' })
        }),
    )
  })

  it.effect.prop(
    'when the form has been submitted but the career stage cannot be saved',
    [
      fc.oneof(fc.careerStageValue(), fc.constant('skip')),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.careerStage()),
    ],
    ([careerStage, user, locale, existingCareerStage]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeCareerStage({ body: { careerStage }, locale, method: 'POST', user })({
            deleteCareerStage: () => TE.left('unavailable'),
            getCareerStage: () => TE.fromEither(existingCareerStage),
            saveCareerStage: () => TE.left('unavailable'),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop('when the form has been skipped', [fc.user(), fc.supportedLocale()], ([user, locale]) =>
    Effect.gen(function* () {
      const deleteCareerStage = vi.fn<_.Env['deleteCareerStage']>(_ => TE.right(undefined))

      const actual = yield* Effect.promise(
        _.changeCareerStage({ body: { careerStage: 'skip' }, locale, method: 'POST', user })({
          deleteCareerStage,
          getCareerStage: shouldNotBeCalled,
          saveCareerStage: shouldNotBeCalled,
        }),
      )

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(deleteCareerStage).toHaveBeenCalledWith(user.orcid)
    }),
  )

  it.effect.prop(
    'when the form has been submitted without setting career stage',
    [fc.record({ careerStage: fc.lorem() }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()],
    ([body, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeCareerStage({ body, locale, method: 'POST', user })({
            deleteCareerStage: shouldNotBeCalled,
            getCareerStage: shouldNotBeCalled,
            saveCareerStage: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeCareerStageMatch.formatter, {}),
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeCareerStage({ body, locale, method, user: undefined })({
            deleteCareerStage: shouldNotBeCalled,
            getCareerStage: shouldNotBeCalled,
            saveCareerStage: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )
})
