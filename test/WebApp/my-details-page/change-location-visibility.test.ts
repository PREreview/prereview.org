import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import { changeLocationVisibilityMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-location-visibility.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeLocationVisibility', () => {
  it.effect.prop(
    'when there is a logged in user',
    [fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.supportedLocale(), fc.location()],
    ([body, method, user, locale, location]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLocationVisibility({ body, locale, method, user })({
            deleteLocation: shouldNotBeCalled,
            getLocation: () => TE.of(location),
            saveLocation: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeLocationVisibilityMatch.formatter, {}),
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
    [fc.locationVisibility(), fc.user(), fc.supportedLocale(), fc.location()],
    ([visibility, user, locale, existingLocation]) =>
      Effect.gen(function* () {
        const saveLocation = vi.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeLocationVisibility({
            body: { locationVisibility: visibility },
            locale,
            method: 'POST',
            user,
          })({
            deleteLocation: shouldNotBeCalled,
            getLocation: () => TE.right(existingLocation),
            saveLocation,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveLocation).toHaveBeenCalledWith(user.orcid, {
          value: existingLocation.value,
          visibility,
        })
      }),
  )

  it.effect.prop(
    'when the form has been submitted but the visibility cannot be saved',
    [fc.record({ locationVisibility: fc.locationVisibility() }), fc.user(), fc.supportedLocale(), fc.location()],
    ([body, user, locale, location]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLocationVisibility({ body, locale, method: 'POST', user })({
            deleteLocation: shouldNotBeCalled,
            getLocation: () => TE.of(location),
            saveLocation: () => TE.left('unavailable'),
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
      fc.record({ locationVisibility: fc.string() }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.location(),
    ],
    ([body, user, locale, location]) =>
      Effect.gen(function* () {
        const saveLocation = vi.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeLocationVisibility({ body, locale, method: 'POST', user })({
            deleteLocation: shouldNotBeCalled,
            getLocation: () => TE.of(location),
            saveLocation,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveLocation).toHaveBeenCalledWith(user.orcid, {
          value: location.value,
          visibility: 'restricted',
        })
      }),
  )

  it.effect.prop(
    "there isn't a location",
    [fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLocationVisibility({ body, locale, method, user })({
            deleteLocation: shouldNotBeCalled,
            getLocation: () => TE.left('not-found'),
            saveLocation: shouldNotBeCalled,
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
          _.changeLocationVisibility({ body, locale, method, user: undefined })({
            deleteLocation: shouldNotBeCalled,
            getLocation: shouldNotBeCalled,
            saveLocation: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )
})
