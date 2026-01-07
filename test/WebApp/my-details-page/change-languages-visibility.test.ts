import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeLanguagesVisibilityMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-languages-visibility.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeLanguagesVisibility', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.languages(),
  ])('when there is a logged in user', async (body, method, user, locale, languages) => {
    const actual = await _.changeLanguagesVisibility({ body, locale, method, user })({
      deleteLanguages: shouldNotBeCalled,
      getLanguages: () => TE.of(languages),
      saveLanguages: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeLanguagesVisibilityMatch.formatter, {}),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  test.prop([fc.languagesVisibility(), fc.user(), fc.supportedLocale(), fc.languages()])(
    'when the form has been submitted',
    async (visibility, user, locale, existingLanguages) => {
      const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

      const actual = await _.changeLanguagesVisibility({
        body: { languagesVisibility: visibility },
        locale,
        method: 'POST',
        user,
      })({
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.right(existingLanguages),
        saveLanguages,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveLanguages).toHaveBeenCalledWith(user.orcid, {
        value: existingLanguages.value,
        visibility,
      })
    },
  )

  test.prop([
    fc.record({ languagesVisibility: fc.languagesVisibility() }),
    fc.user(),
    fc.supportedLocale(),
    fc.languages(),
  ])('when the form has been submitted but the visibility cannot be saved', async (body, user, locale, languages) => {
    const actual = await _.changeLanguagesVisibility({ body, locale, method: 'POST', user })({
      deleteLanguages: shouldNotBeCalled,
      getLanguages: () => TE.of(languages),
      saveLanguages: () => TE.left('unavailable'),
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
    fc.record({ languagesVisibility: fc.string() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.languages(),
  ])('when the form has been submitted without setting visibility', async (body, user, locale, languages) => {
    const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

    const actual = await _.changeLanguagesVisibility({ body, locale, method: 'POST', user })({
      deleteLanguages: shouldNotBeCalled,
      getLanguages: () => TE.of(languages),
      saveLanguages,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(saveLanguages).toHaveBeenCalledWith(user.orcid, {
      value: languages.value,
      visibility: 'restricted',
    })
  })

  test.prop([fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    "there aren't languages",
    async (body, method, user, locale) => {
      const actual = await _.changeLanguagesVisibility({ body, locale, method, user })({
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.left('not-found'),
        saveLanguages: shouldNotBeCalled,
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
      const actual = await _.changeLanguagesVisibility({ body, locale, method, user: undefined })({
        deleteLanguages: shouldNotBeCalled,
        getLanguages: shouldNotBeCalled,
        saveLanguages: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )
})
