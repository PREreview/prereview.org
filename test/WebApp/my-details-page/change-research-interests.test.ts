import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeResearchInterestsMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-research-interests.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeResearchInterests', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.researchInterests()),
  ])('when there is a logged in user', async (body, method, user, locale, researchInterests) => {
    const actual = await _.changeResearchInterests({ body, locale, method, user })({
      deleteResearchInterests: shouldNotBeCalled,
      getResearchInterests: () => TE.fromEither(researchInterests),
      saveResearchInterests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeResearchInterestsMatch.formatter, {}),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.nonEmptyString(), fc.user(), fc.supportedLocale(), fc.researchInterests()])(
      'there are research interests already',
      async (researchInterests, user, locale, existingResearchInterests) => {
        const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

        const actual = await _.changeResearchInterests({ body: { researchInterests }, locale, method: 'POST', user })({
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: () => TE.right(existingResearchInterests),
          saveResearchInterests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
          value: researchInterests,
          visibility: existingResearchInterests.visibility,
        })
      },
    )

    test.prop([fc.nonEmptyString(), fc.user(), fc.supportedLocale()])(
      "there aren't research interests already",
      async (researchInterests, user, locale) => {
        const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

        const actual = await _.changeResearchInterests({ body: { researchInterests }, locale, method: 'POST', user })({
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: () => TE.left('not-found'),
          saveResearchInterests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
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
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.researchInterests()),
  ])(
    'when the form has been submitted but the research interests cannot be saved',
    async (body, user, locale, existingResearchInterests) => {
      const actual = await _.changeResearchInterests({ body, locale, method: 'POST', user })({
        deleteResearchInterests: () => TE.left('unavailable'),
        getResearchInterests: () => TE.fromEither(existingResearchInterests),
        saveResearchInterests: () => TE.left('unavailable'),
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

  test.prop([fc.record({ researchInterests: fc.constant('') }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()])(
    'when the form has been submitted without setting research interests',
    async (body, user, locale) => {
      const deleteResearchInterests = jest.fn<_.Env['deleteResearchInterests']>(_ => TE.right(undefined))

      const actual = await _.changeResearchInterests({ body, locale, method: 'POST', user })({
        deleteResearchInterests,
        getResearchInterests: shouldNotBeCalled,
        saveResearchInterests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(deleteResearchInterests).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.anything(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (body, method, locale) => {
      const actual = await _.changeResearchInterests({ body, locale, method, user: undefined })({
        deleteResearchInterests: shouldNotBeCalled,
        getResearchInterests: shouldNotBeCalled,
        saveResearchInterests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )
})
