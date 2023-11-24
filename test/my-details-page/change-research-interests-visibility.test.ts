import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-research-interests-visibility'
import { changeResearchInterestsVisibilityMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeResearchInterestsVisibility', () => {
  test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.researchInterests()])(
    'when there is a logged in user',
    async (body, method, user, researchInterests) => {
      const actual = await _.changeResearchInterestsVisibility({ body, method, user })({
        deleteResearchInterests: shouldNotBeCalled,
        getResearchInterests: () => TE.of(researchInterests),
        saveResearchInterests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeResearchInterestsVisibilityMatch.formatter, {}),
        status: Status.OK,
        title: expect.stringContaining('research interests'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('research interests'),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  test.prop([fc.researchInterestsVisibility(), fc.user(), fc.researchInterests()])(
    'when the form has been submitted',
    async (visibility, user, existingResearchInterests) => {
      const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

      const actual = await _.changeResearchInterestsVisibility({
        body: { researchInterestsVisibility: visibility },
        method: 'POST',
        user,
      })({
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
        value: existingResearchInterests.value,
        visibility,
      })
    },
  )

  test.prop([
    fc.record({ researchInterestsVisibility: fc.researchInterestsVisibility() }),
    fc.user(),
    fc.researchInterests(),
  ])('when the form has been submitted but the visibility cannot be saved', async (body, user, researchInterests) => {
    const actual = await _.changeResearchInterestsVisibility({ body, method: 'POST', user })({
      deleteResearchInterests: shouldNotBeCalled,
      getResearchInterests: () => TE.of(researchInterests),
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
  })

  test.prop([
    fc.record({ researchInterestsVisibility: fc.string() }, { withDeletedKeys: true }),
    fc.user(),
    fc.researchInterests(),
  ])('when the form has been submitted without setting visibility', async (body, user, researchInterests) => {
    const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

    const actual = await _.changeResearchInterestsVisibility({ body, method: 'POST', user })({
      deleteResearchInterests: shouldNotBeCalled,
      getResearchInterests: () => TE.of(researchInterests),
      saveResearchInterests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
      value: researchInterests.value,
      visibility: 'restricted',
    })
  })

  test.prop([fc.anything(), fc.string(), fc.user()])("there aren't research interests", async (body, method, user) => {
    const actual = await _.changeResearchInterestsVisibility({ body, method, user })({
      deleteResearchInterests: shouldNotBeCalled,
      getResearchInterests: () => TE.left('not-found'),
      saveResearchInterests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeResearchInterestsVisibility({ body, method, user: undefined })({
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
