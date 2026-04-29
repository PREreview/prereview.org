import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import { changeCareerStageVisibilityMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-career-stage-visibility.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeCareerStageVisibility', () => {
  it.effect.prop(
    'when there is a logged in user',
    [fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.supportedLocale(), fc.careerStage()],
    ([body, method, user, locale, careerStage]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeCareerStageVisibility({ body, locale, method, user })({
            deleteCareerStage: shouldNotBeCalled,
            getCareerStage: () => TE.of(careerStage),
            saveCareerStage: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeCareerStageVisibilityMatch.formatter, {}),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the form has been submitted',
    [fc.careerStageVisibility(), fc.user(), fc.supportedLocale(), fc.careerStage()],
    ([visibility, user, locale, existingCareerStage]) =>
      Effect.gen(function* () {
        const saveCareerStage = vi.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeCareerStageVisibility({
            body: { careerStageVisibility: visibility },
            method: 'POST',
            locale,
            user,
          })({
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
          value: existingCareerStage.value,
          visibility,
        })
      }),
  )

  it.effect.prop(
    'when the form has been submitted but the visibility cannot be saved',
    [
      fc.record({ careerStageVisibility: fc.careerStageVisibility() }),
      fc.user(),
      fc.supportedLocale(),
      fc.careerStage(),
    ],
    ([body, user, locale, careerStage]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeCareerStageVisibility({ body, locale, method: 'POST', user })({
            deleteCareerStage: shouldNotBeCalled,
            getCareerStage: () => TE.of(careerStage),
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

  it.effect.prop(
    'when the form has been submitted without setting visibility',
    [
      fc.record({ careerStageVisibility: fc.string() }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.careerStage(),
    ],
    ([body, user, locale, careerStage]) =>
      Effect.gen(function* () {
        const saveCareerStage = vi.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeCareerStageVisibility({ body, locale, method: 'POST', user })({
            deleteCareerStage: shouldNotBeCalled,
            getCareerStage: () => TE.of(careerStage),
            saveCareerStage,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, {
          value: careerStage.value,
          visibility: 'restricted',
        })
      }),
  )

  it.effect.prop(
    "there isn't a career stage",
    [fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeCareerStageVisibility({ body, locale, method, user })({
            deleteCareerStage: shouldNotBeCalled,
            getCareerStage: () => TE.left('not-found'),
            saveCareerStage: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeCareerStageVisibility({ body, locale, method, user: undefined })({
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
