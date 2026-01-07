import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeLanguagesMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-languages.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeLanguages', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.languages()),
  ])('when there is a logged in user', async (body, method, user, locale, languages) => {
    const actual = await _.changeLanguages({ body, locale, method, user })({
      deleteLanguages: shouldNotBeCalled,
      getLanguages: () => TE.fromEither(languages),
      saveLanguages: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeLanguagesMatch.formatter, {}),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.nonEmptyString(), fc.user(), fc.supportedLocale(), fc.languages()])(
      'there are languages already',
      async (languages, user, locale, existingLanguages) => {
        const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

        const actual = await _.changeLanguages({ body: { languages }, locale, method: 'POST', user })({
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
          value: languages,
          visibility: existingLanguages.visibility,
        })
      },
    )

    test.prop([fc.nonEmptyString(), fc.user(), fc.supportedLocale()])(
      "when there aren't languages already",
      async (languages, user, locale) => {
        const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

        const actual = await _.changeLanguages({ body: { languages }, locale, method: 'POST', user })({
          deleteLanguages: shouldNotBeCalled,
          getLanguages: () => TE.left('not-found'),
          saveLanguages,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveLanguages).toHaveBeenCalledWith(user.orcid, { value: languages, visibility: 'restricted' })
      },
    )
  })

  test.prop([
    fc.record({ languages: fc.nonEmptyString() }),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.languages()),
  ])(
    'when the form has been submitted but languages cannot be saved',
    async (body, user, locale, existingLanguages) => {
      const actual = await _.changeLanguages({ body, locale, method: 'POST', user })({
        deleteLanguages: () => TE.left('unavailable'),
        getLanguages: () => TE.fromEither(existingLanguages),
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
    },
  )

  test.prop([fc.record({ languages: fc.constant('') }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()])(
    'when the form has been submitted without setting languages',
    async (body, user, locale) => {
      const deleteLanguages = jest.fn<_.Env['deleteLanguages']>(_ => TE.right(undefined))

      const actual = await _.changeLanguages({ body, locale, method: 'POST', user })({
        deleteLanguages,
        getLanguages: shouldNotBeCalled,
        saveLanguages: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(deleteLanguages).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.anything(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (body, method, locale) => {
      const actual = await _.changeLanguages({ body, locale, method, user: undefined })({
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
