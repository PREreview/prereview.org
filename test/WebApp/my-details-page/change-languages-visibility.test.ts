import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeLanguagesVisibilityMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-languages-visibility.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeLanguagesVisibility', () => {
  it.effect.prop(
    'when there is a logged in user',
    [fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.supportedLocale(), fc.languages()],
    ([body, method, user, locale, languages]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLanguagesVisibility({ body, locale, method, user })({
            deleteLanguages: shouldNotBeCalled,
            getLanguages: () => TE.of(languages),
            saveLanguages: shouldNotBeCalled,
          }),
        )

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
      }),
  )

  it.effect.prop(
    'when the form has been submitted',
    [fc.languagesVisibility(), fc.user(), fc.supportedLocale(), fc.languages()],
    ([visibility, user, locale, existingLanguages]) =>
      Effect.gen(function* () {
        const saveLanguages = vi.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeLanguagesVisibility({
            body: { languagesVisibility: visibility },
            locale,
            method: 'POST',
            user,
          })({
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
          value: existingLanguages.value,
          visibility,
        })
      }),
  )

  it.effect.prop(
    'when the form has been submitted but the visibility cannot be saved',
    [fc.record({ languagesVisibility: fc.languagesVisibility() }), fc.user(), fc.supportedLocale(), fc.languages()],
    ([body, user, locale, languages]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLanguagesVisibility({ body, locale, method: 'POST', user })({
            deleteLanguages: shouldNotBeCalled,
            getLanguages: () => TE.of(languages),
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
    'when the form has been submitted without setting visibility',
    [
      fc.record({ languagesVisibility: fc.string() }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.languages(),
    ],
    ([body, user, locale, languages]) =>
      Effect.gen(function* () {
        const saveLanguages = vi.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeLanguagesVisibility({ body, locale, method: 'POST', user })({
            deleteLanguages: shouldNotBeCalled,
            getLanguages: () => TE.of(languages),
            saveLanguages,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveLanguages).toHaveBeenCalledWith(user.orcid, {
          value: languages.value,
          visibility: 'restricted',
        })
      }),
  )

  it.effect.prop(
    "there aren't languages",
    [fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLanguagesVisibility({ body, locale, method, user })({
            deleteLanguages: shouldNotBeCalled,
            getLanguages: () => TE.left('not-found'),
            saveLanguages: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLanguagesVisibility({ body, locale, method, user: undefined })({
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
