import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/my-details-page/change-research-interests-visibility.ts'
import { changeResearchInterestsVisibilityMatch, myDetailsMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('changeResearchInterestsVisibility', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.researchInterests(),
  ])('when there is a logged in user', async (body, method, user, locale, researchInterests) => {
    const actual = await _.changeResearchInterestsVisibility({ body, locale, method, user })({
      deleteResearchInterests: shouldNotBeCalled,
      getResearchInterests: () => TE.of(researchInterests),
      saveResearchInterests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeResearchInterestsVisibilityMatch.formatter, {}),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  test.prop([fc.researchInterestsVisibility(), fc.user(), fc.supportedLocale(), fc.researchInterests()])(
    'when the form has been submitted',
    async (visibility, user, locale, existingResearchInterests) => {
      const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

      const actual = await _.changeResearchInterestsVisibility({
        body: { researchInterestsVisibility: visibility },
        locale,
        method: 'POST',
        user,
      })({
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
        value: existingResearchInterests.value,
        visibility,
      })
    },
  )

  test.prop([
    fc.record({ researchInterestsVisibility: fc.researchInterestsVisibility() }),
    fc.user(),
    fc.supportedLocale(),
    fc.researchInterests(),
  ])(
    'when the form has been submitted but the visibility cannot be saved',
    async (body, user, locale, researchInterests) => {
      const actual = await _.changeResearchInterestsVisibility({ body, locale, method: 'POST', user })({
        deleteResearchInterests: shouldNotBeCalled,
        getResearchInterests: () => TE.of(researchInterests),
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

  test.prop([
    fc.record({ researchInterestsVisibility: fc.string() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.researchInterests(),
  ])('when the form has been submitted without setting visibility', async (body, user, locale, researchInterests) => {
    const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

    const actual = await _.changeResearchInterestsVisibility({ body, locale, method: 'POST', user })({
      deleteResearchInterests: shouldNotBeCalled,
      getResearchInterests: () => TE.of(researchInterests),
      saveResearchInterests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
      value: researchInterests.value,
      visibility: 'restricted',
    })
  })

  test.prop([fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    "there aren't research interests",
    async (body, method, user, locale) => {
      const actual = await _.changeResearchInterestsVisibility({ body, locale, method, user })({
        deleteResearchInterests: shouldNotBeCalled,
        getResearchInterests: () => TE.left('not-found'),
        saveResearchInterests: shouldNotBeCalled,
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
      const actual = await _.changeResearchInterestsVisibility({ body, locale, method, user: undefined })({
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
