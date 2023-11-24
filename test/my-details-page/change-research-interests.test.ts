import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-research-interests'
import { changeResearchInterestsMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeResearchInterests', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.researchInterests()),
  ])('when there is a logged in user', async (body, method, user, researchInterests) => {
    const actual = await _.changeResearchInterests({ body, method, user })({
      deleteResearchInterests: shouldNotBeCalled,
      getResearchInterests: () => TE.fromEither(researchInterests),
      saveResearchInterests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeResearchInterestsMatch.formatter, {}),
      status: Status.OK,
      title: expect.stringContaining('research interests'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('research interests'),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.nonEmptyString(), fc.user(), fc.researchInterests()])(
      'there are research interests already',
      async (researchInterests, user, existingResearchInterests) => {
        const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

        const actual = await _.changeResearchInterests({ body: { researchInterests }, method: 'POST', user })({
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: () => TE.right(existingResearchInterests),
          saveResearchInterests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
          value: researchInterests,
          visibility: existingResearchInterests.visibility,
        })
      },
    )

    test.prop([fc.nonEmptyString(), fc.user()])(
      "there aren't research interests already",
      async (researchInterests, user) => {
        const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

        const actual = await _.changeResearchInterests({ body: { researchInterests }, method: 'POST', user })({
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: () => TE.left('not-found'),
          saveResearchInterests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
          value: researchInterests,
          visibility: 'restricted',
        })
      },
    )
  })

  test.prop([
    fc.record({ researchInterests: fc.nonEmptyString() }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.researchInterests()),
  ])(
    'when the form has been submitted but the research interests cannot be saved',
    async (body, user, existingResearchInterests) => {
      const actual = await _.changeResearchInterests({ body, method: 'POST', user })({
        deleteResearchInterests: () => TE.left('unavailable'),
        getResearchInterests: () => TE.fromEither(existingResearchInterests),
        saveResearchInterests: () => TE.left('unavailable'),
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

  test.prop([fc.record({ researchInterests: fc.constant('') }, { withDeletedKeys: true }), fc.user()])(
    'when the form has been submitted without setting research interests',
    async (body, user) => {
      const deleteResearchInterests = jest.fn<_.Env['deleteResearchInterests']>(_ => TE.right(undefined))

      const actual = await _.changeResearchInterests({ body, method: 'POST', user })({
        deleteResearchInterests,
        getResearchInterests: shouldNotBeCalled,
        saveResearchInterests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(deleteResearchInterests).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeResearchInterests({ body, method, user: undefined })({
      deleteResearchInterests: shouldNotBeCalled,
      getResearchInterests: shouldNotBeCalled,
      saveResearchInterests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
