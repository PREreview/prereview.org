import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeLanguagesMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-languages.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeLanguages', () => {
  it.effect.prop(
    'when there is a logged in user',
    [
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.languages()),
    ],
    ([body, method, user, locale, languages]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLanguages({ body, locale, method, user })({
            deleteLanguages: shouldNotBeCalled,
            getLanguages: () => TE.fromEither(languages),
            saveLanguages: shouldNotBeCalled,
          }),
        )

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
      }),
  )

  describe('when the form has been submitted', () => {
    it.effect.prop(
      'there are languages already',
      [fc.nonEmptyString(), fc.user(), fc.supportedLocale(), fc.languages()],
      ([languages, user, locale, existingLanguages]) =>
        Effect.gen(function* () {
          const saveLanguages = vi.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeLanguages({ body: { languages }, locale, method: 'POST', user })({
              deleteLanguages: shouldNotBeCalled,
              getLanguages: () => TE.right(existingLanguages),
              saveLanguages,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveLanguages).toHaveBeenCalledWith(user.orcid, {
            value: languages,
            visibility: existingLanguages.visibility,
          })
        }),
    )

    it.effect.prop(
      "when there aren't languages already",
      [fc.nonEmptyString(), fc.user(), fc.supportedLocale()],
      ([languages, user, locale]) =>
        Effect.gen(function* () {
          const saveLanguages = vi.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeLanguages({ body: { languages }, locale, method: 'POST', user })({
              deleteLanguages: shouldNotBeCalled,
              getLanguages: () => TE.left('not-found'),
              saveLanguages,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveLanguages).toHaveBeenCalledWith(user.orcid, { value: languages, visibility: 'restricted' })
        }),
    )
  })

  it.effect.prop(
    'when the form has been submitted but languages cannot be saved',
    [
      fc.record({ languages: fc.nonEmptyString() }),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.languages()),
    ],
    ([body, user, locale, existingLanguages]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLanguages({ body, locale, method: 'POST', user })({
            deleteLanguages: () => TE.left('unavailable'),
            getLanguages: () => TE.fromEither(existingLanguages),
            saveLanguages: () => TE.left('unavailable'),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the form has been submitted without setting languages',
    [fc.record({ languages: fc.constant('') }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()],
    ([body, user, locale]) =>
      Effect.gen(function* () {
        const deleteLanguages = vi.fn<_.Env['deleteLanguages']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeLanguages({ body, locale, method: 'POST', user })({
            deleteLanguages,
            getLanguages: shouldNotBeCalled,
            saveLanguages: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(deleteLanguages).toHaveBeenCalledWith(user.orcid)
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLanguages({ body, locale, method, user: undefined })({
            deleteLanguages: shouldNotBeCalled,
            getLanguages: shouldNotBeCalled,
            saveLanguages: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )
})
