import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-career-stage'
import { changeCareerStageMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeCareerStage', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.careerStage()),
  ])('when there is a logged in user', async (body, method, user, careerStage) => {
    const actual = await _.changeCareerStage({ body, method, user })({
      deleteCareerStage: shouldNotBeCalled,
      getCareerStage: () => TE.fromEither(careerStage),
      saveCareerStage: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeCareerStageMatch.formatter, {}),
      status: Status.OK,
      title: expect.stringContaining('career stage'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('career stage'),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.careerStageValue(), fc.user(), fc.careerStage()])(
      'there is a career stage already',
      async (careerStage, user, existingCareerStage) => {
        const saveCareerStage = jest.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

        const actual = await _.changeCareerStage({ body: { careerStage }, method: 'POST', user })({
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
          value: careerStage,
          visibility: existingCareerStage.visibility,
        })
      },
    )

    test.prop([fc.careerStageValue(), fc.user()])(
      "when there isn't a career stage already",
      async (careerStage, user) => {
        const saveCareerStage = jest.fn<_.Env['saveCareerStage']>(_ => TE.right(undefined))

        const actual = await _.changeCareerStage({ body: { careerStage }, method: 'POST', user })({
          deleteCareerStage: shouldNotBeCalled,
          getCareerStage: () => TE.left('not-found'),
          saveCareerStage,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, { value: careerStage, visibility: 'restricted' })
      },
    )
  })

  test.prop([
    fc.oneof(fc.careerStageValue(), fc.constant('skip')),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.careerStage()),
  ])(
    'when the form has been submitted but the career stage cannot be saved',
    async (careerStage, user, existingCareerStage) => {
      const actual = await _.changeCareerStage({ body: { careerStage }, method: 'POST', user })({
        deleteCareerStage: () => TE.left('unavailable'),
        getCareerStage: () => TE.fromEither(existingCareerStage),
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

  test.prop([fc.user()])('when the form has been skipped', async user => {
    const deleteCareerStage = jest.fn<_.Env['deleteCareerStage']>(_ => TE.right(undefined))

    const actual = await _.changeCareerStage({ body: { careerStage: 'skip' }, method: 'POST', user })({
      deleteCareerStage,
      getCareerStage: shouldNotBeCalled,
      saveCareerStage: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(deleteCareerStage).toHaveBeenCalledWith(user.orcid)
  })

  test.prop([fc.record({ careerStage: fc.lorem() }, { withDeletedKeys: true }), fc.user()])(
    'when the form has been submitted without setting career stage',
    async (body, user) => {
      const actual = await _.changeCareerStage({ body, method: 'POST', user })({
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: shouldNotBeCalled,
        saveCareerStage: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeCareerStageMatch.formatter, {}),
        status: Status.BadRequest,
        title: expect.stringContaining('career stage'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('career stage'),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    },
  )

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeCareerStage({ body, method, user: undefined })({
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
