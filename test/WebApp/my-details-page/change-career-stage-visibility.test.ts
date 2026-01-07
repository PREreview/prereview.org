import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeCareerStageVisibilityMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-career-stage-visibility.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeCareerStageVisibility', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.careerStage(),
  ])('when there is a logged in user', async (body, method, user, locale, careerStage) => {
    const actual = await _.changeCareerStageVisibility({ body, locale, method, user })({
      deleteCareerStage: shouldNotBeCalled,
      getCareerStage: () => TE.of(careerStage),
      saveCareerStage: shouldNotBeCalled,
    })()

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
  })

  test.prop([fc.careerStageVisibility(), fc.user(), fc.supportedLocale(), fc.careerStage()])(
    'when the form has been submitted',
    async (visibility, user, locale, existingCareerStage) => {
      const saveCareerStage = jest.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

      const actual = await _.changeCareerStageVisibility({
        body: { careerStageVisibility: visibility },
        method: 'POST',
        locale,
        user,
      })({
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
        value: existingCareerStage.value,
        visibility,
      })
    },
  )

  test.prop([
    fc.record({ careerStageVisibility: fc.careerStageVisibility() }),
    fc.user(),
    fc.supportedLocale(),
    fc.careerStage(),
  ])('when the form has been submitted but the visibility cannot be saved', async (body, user, locale, careerStage) => {
    const actual = await _.changeCareerStageVisibility({ body, locale, method: 'POST', user })({
      deleteCareerStage: shouldNotBeCalled,
      getCareerStage: () => TE.of(careerStage),
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
  })

  test.prop([
    fc.record({ careerStageVisibility: fc.string() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.careerStage(),
  ])('when the form has been submitted without setting visibility', async (body, user, locale, careerStage) => {
    const saveCareerStage = jest.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

    const actual = await _.changeCareerStageVisibility({ body, locale, method: 'POST', user })({
      deleteCareerStage: shouldNotBeCalled,
      getCareerStage: () => TE.of(careerStage),
      saveCareerStage,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, {
      value: careerStage.value,
      visibility: 'restricted',
    })
  })

  test.prop([fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    "there isn't a career stage",
    async (body, method, user, locale) => {
      const actual = await _.changeCareerStageVisibility({ body, locale, method, user })({
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: () => TE.left('not-found'),
        saveCareerStage: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )

  test.prop([fc.anything(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (body, method, locale) => {
      const actual = await _.changeCareerStageVisibility({ body, locale, method, user: undefined })({
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
