import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-languages-visibility'
import { changeLanguagesVisibilityMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeLanguagesVisibility', () => {
  test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.languages()])(
    'when there is a logged in user',
    async (body, method, user, languages) => {
      const actual = await _.changeLanguagesVisibility({ body, method, user })({
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.of(languages),
        saveLanguages: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeLanguagesVisibilityMatch.formatter, {}),
        status: Status.OK,
        title: expect.stringContaining('languages'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('languages'),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  test.prop([fc.languagesVisibility(), fc.user(), fc.languages()])(
    'when the form has been submitted',
    async (visibility, user, existingLanguages) => {
      const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

      const actual = await _.changeLanguagesVisibility({
        body: { languagesVisibility: visibility },
        method: 'POST',
        user,
      })({
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.right(existingLanguages),
        saveLanguages,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveLanguages).toHaveBeenCalledWith(user.orcid, {
        value: existingLanguages.value,
        visibility,
      })
    },
  )

  test.prop([fc.record({ languagesVisibility: fc.languagesVisibility() }), fc.user(), fc.languages()])(
    'when the form has been submitted but the visibility cannot be saved',
    async (body, user, languages) => {
      const actual = await _.changeLanguagesVisibility({ body, method: 'POST', user })({
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.of(languages),
        saveLanguages: () => TE.left('unavailable'),
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

  test.prop([fc.record({ languagesVisibility: fc.string() }, { withDeletedKeys: true }), fc.user(), fc.languages()])(
    'when the form has been submitted without setting visibility',
    async (body, user, languages) => {
      const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

      const actual = await _.changeLanguagesVisibility({ body, method: 'POST', user })({
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.of(languages),
        saveLanguages,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveLanguages).toHaveBeenCalledWith(user.orcid, {
        value: languages.value,
        visibility: 'restricted',
      })
    },
  )

  test.prop([fc.anything(), fc.string(), fc.user()])("there aren't languages", async (body, method, user) => {
    const actual = await _.changeLanguagesVisibility({ body, method, user })({
      deleteLanguages: shouldNotBeCalled,
      getLanguages: () => TE.left('not-found'),
      saveLanguages: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeLanguagesVisibility({ body, method, user: undefined })({
      deleteLanguages: shouldNotBeCalled,
      getLanguages: shouldNotBeCalled,
      saveLanguages: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
