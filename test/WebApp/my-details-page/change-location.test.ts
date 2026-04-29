import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import { changeLocationMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-location.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeLocation', () => {
  it.effect.prop(
    'when there is a logged in user',
    [
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.location()),
    ],
    ([body, method, user, locale, location]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLocation({ body, locale, method, user })({
            deleteLocation: shouldNotBeCalled,
            getLocation: () => TE.fromEither(location),
            saveLocation: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeLocationMatch.formatter, {}),
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
      'there is a location already',
      [fc.nonEmptyString(), fc.user(), fc.supportedLocale(), fc.location()],
      ([location, user, locale, existingLocation]) =>
        Effect.gen(function* () {
          const saveLocation = vi.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeLocation({ body: { location }, locale, method: 'POST', user })({
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
            value: location,
            visibility: existingLocation.visibility,
          })
        }),
    )

    it.effect.prop(
      "when there isn't a location already",
      [fc.nonEmptyString(), fc.user(), fc.supportedLocale()],
      ([location, user, locale]) =>
        Effect.gen(function* () {
          const saveLocation = vi.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeLocation({ body: { location }, locale, method: 'POST', user })({
              deleteLocation: shouldNotBeCalled,
              getLocation: () => TE.left('not-found'),
              saveLocation,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveLocation).toHaveBeenCalledWith(user.orcid, { value: location, visibility: 'restricted' })
        }),
    )
  })

  it.effect.prop(
    'when the form has been submitted but the location cannot be saved',
    [
      fc.record({ location: fc.nonEmptyString() }),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.location()),
    ],
    ([body, user, locale, existingLocation]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLocation({ body, locale, method: 'POST', user })({
            deleteLocation: () => TE.left('unavailable'),
            getLocation: () => TE.fromEither(existingLocation),
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
    'when the form has been submitted without setting a location',
    [fc.record({ location: fc.constant('') }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()],
    ([body, user, locale]) =>
      Effect.gen(function* () {
        const deleteLocation = vi.fn<_.Env['deleteLocation']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeLocation({ body, locale, method: 'POST', user })({
            deleteLocation,
            getLocation: shouldNotBeCalled,
            saveLocation: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(deleteLocation).toHaveBeenCalledWith(user.orcid)
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeLocation({ body, locale, method, user: undefined })({
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
