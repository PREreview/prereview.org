import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-career-stage-visibility'
import { changeCareerStageVisibilityMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeCareerStageVisibility', () => {
  test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.careerStage()])(
    'when there is a logged in user',
    async (body, method, user, careerStage) => {
      const actual = await _.changeCareerStageVisibility({ body, method, user })({
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: () => TE.of(careerStage),
        saveCareerStage: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeCareerStageVisibilityMatch.formatter, {}),
        status: Status.OK,
        title: expect.stringContaining('career stage'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('career stage'),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  test.prop([fc.careerStageVisibility(), fc.user(), fc.careerStage()])(
    'when the form has been submitted',
    async (visibility, user, existingCareerStage) => {
      const saveCareerStage = jest.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

      const actual = await _.changeCareerStageVisibility({
        body: { careerStageVisibility: visibility },
        method: 'POST',
        user,
      })({
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: () => TE.right(existingCareerStage),
        saveCareerStage,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, {
        value: existingCareerStage.value,
        visibility,
      })
    },
  )

  test.prop([fc.record({ careerStageVisibility: fc.careerStageVisibility() }), fc.user(), fc.careerStage()])(
    'when the form has been submitted but the visibility cannot be saved',
    async (body, user, careerStage) => {
      const actual = await _.changeCareerStageVisibility({ body, method: 'POST', user })({
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: () => TE.of(careerStage),
        saveCareerStage: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([
    fc.record({ careerStageVisibility: fc.string() }, { withDeletedKeys: true }),
    fc.user(),
    fc.careerStage(),
  ])('when the form has been submitted without setting visibility', async (body, user, careerStage) => {
    const saveCareerStage = jest.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

    const actual = await _.changeCareerStageVisibility({ body, method: 'POST', user })({
      deleteCareerStage: shouldNotBeCalled,
      getCareerStage: () => TE.of(careerStage),
      saveCareerStage,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, {
      value: careerStage.value,
      visibility: 'restricted',
    })
  })

  test.prop([fc.anything(), fc.string(), fc.user()])("there isn't a career stage", async (body, method, user) => {
    const actual = await _.changeCareerStageVisibility({ body, method, user })({
      deleteCareerStage: shouldNotBeCalled,
      getCareerStage: () => TE.left('not-found'),
      saveCareerStage: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeCareerStageVisibility({ body, method, user: undefined })({
      deleteCareerStage: shouldNotBeCalled,
      getCareerStage: shouldNotBeCalled,
      saveCareerStage: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
