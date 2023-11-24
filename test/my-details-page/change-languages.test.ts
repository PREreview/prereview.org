import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-languages'
import { changeLanguagesMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeLanguages', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.languages()),
  ])('when there is a logged in user', async (body, method, user, languages) => {
    const actual = await _.changeLanguages({ body, method, user })({
      deleteLanguages: shouldNotBeCalled,
      getLanguages: () => TE.fromEither(languages),
      saveLanguages: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeLanguagesMatch.formatter, {}),
      status: Status.OK,
      title: expect.stringContaining('languages'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('languages'),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.nonEmptyString(), fc.user(), fc.languages()])(
      'there are languages already',
      async (languages, user, existingLanguages) => {
        const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

        const actual = await _.changeLanguages({ body: { languages }, method: 'POST', user })({
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
          value: languages,
          visibility: existingLanguages.visibility,
        })
      },
    )

    test.prop([fc.nonEmptyString(), fc.user()])("when there aren't languages already", async (languages, user) => {
      const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

      const actual = await _.changeLanguages({ body: { languages }, method: 'POST', user })({
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.left('not-found'),
        saveLanguages,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveLanguages).toHaveBeenCalledWith(user.orcid, { value: languages, visibility: 'restricted' })
    })
  })

  test.prop([
    fc.record({ languages: fc.nonEmptyString() }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.languages()),
  ])('when the form has been submitted but languages cannot be saved', async (body, user, existingLanguages) => {
    const actual = await _.changeLanguages({ body, method: 'POST', user })({
      deleteLanguages: () => TE.left('unavailable'),
      getLanguages: () => TE.fromEither(existingLanguages),
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
  })

  test.prop([fc.record({ languages: fc.constant('') }, { withDeletedKeys: true }), fc.user()])(
    'when the form has been submitted without setting languages',
    async (body, user) => {
      const deleteLanguages = jest.fn<_.Env['deleteLanguages']>(_ => TE.right(undefined))

      const actual = await _.changeLanguages({ body, method: 'POST', user })({
        deleteLanguages,
        getLanguages: shouldNotBeCalled,
        saveLanguages: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(deleteLanguages).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeLanguages({ body, method, user: undefined })({
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
