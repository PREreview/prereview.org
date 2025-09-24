import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/my-details-page/change-career-stage.ts'
import { changeCareerStageMatch, myDetailsMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('changeCareerStage', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.careerStage()),
  ])('when there is a logged in user', async (body, method, user, locale, careerStage) => {
    const actual = await _.changeCareerStage({ body, locale, method, user })({
      deleteCareerStage: shouldNotBeCalled,
      getCareerStage: () => TE.fromEither(careerStage),
      saveCareerStage: shouldNotBeCalled,
    })()

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
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.careerStageValue(), fc.user(), fc.supportedLocale(), fc.careerStage()])(
      'there is a career stage already',
      async (careerStage, user, locale, existingCareerStage) => {
        const saveCareerStage = jest.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

        const actual = await _.changeCareerStage({ body: { careerStage }, locale, method: 'POST', user })({
          deleteCareerStage: shouldNotBeCalled,
          getCareerStage: () => TE.right(existingCareerStage),
          saveCareerStage,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, {
          value: careerStage,
          visibility: existingCareerStage.visibility,
        })
      },
    )

    test.prop([fc.careerStageValue(), fc.user(), fc.supportedLocale()])(
      "when there isn't a career stage already",
      async (careerStage, user, locale) => {
        const saveCareerStage = jest.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

        const actual = await _.changeCareerStage({ body: { careerStage }, locale, method: 'POST', user })({
          deleteCareerStage: shouldNotBeCalled,
          getCareerStage: () => TE.left('not-found'),
          saveCareerStage,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, { value: careerStage, visibility: 'restricted' })
      },
    )
  })

  test.prop([
    fc.oneof(fc.careerStageValue(), fc.constant('skip')),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.careerStage()),
  ])(
    'when the form has been submitted but the career stage cannot be saved',
    async (careerStage, user, locale, existingCareerStage) => {
      const actual = await _.changeCareerStage({ body: { careerStage }, locale, method: 'POST', user })({
        deleteCareerStage: () => TE.left('unavailable'),
        getCareerStage: () => TE.fromEither(existingCareerStage),
        saveCareerStage: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.user(), fc.supportedLocale()])('when the form has been skipped', async (user, locale) => {
    const deleteCareerStage = jest.fn<_.Env['deleteCareerStage']>(_ => TE.right(undefined))

    const actual = await _.changeCareerStage({ body: { careerStage: 'skip' }, locale, method: 'POST', user })({
      deleteCareerStage,
      getCareerStage: shouldNotBeCalled,
      saveCareerStage: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(deleteCareerStage).toHaveBeenCalledWith(user.orcid)
  })

  test.prop([fc.record({ careerStage: fc.lorem() }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()])(
    'when the form has been submitted without setting career stage',
    async (body, user, locale) => {
      const actual = await _.changeCareerStage({ body, locale, method: 'POST', user })({
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: shouldNotBeCalled,
        saveCareerStage: shouldNotBeCalled,
      })()

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
    },
  )

  test.prop([fc.anything(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (body, method, locale) => {
      const actual = await _.changeCareerStage({ body, locale, method, user: undefined })({
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: shouldNotBeCalled,
        saveCareerStage: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )
})
