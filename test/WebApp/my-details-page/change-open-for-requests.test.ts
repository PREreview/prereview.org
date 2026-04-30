import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeOpenForRequestsMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-open-for-requests.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeOpenForRequests', () => {
  it.effect.prop(
    'when there is a logged in user',
    [
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.isOpenForRequests()),
    ],
    ([body, method, user, locale, openForRequests]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeOpenForRequests({ body, locale, method, user })({
            isOpenForRequests: () => TE.fromEither(openForRequests),
            saveOpenForRequests: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeOpenForRequestsMatch.formatter, {}),
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
      'there is open for requests already',
      [fc.constantFrom('yes', 'no'), fc.user(), fc.supportedLocale(), fc.isOpenForRequests()],
      ([openForRequests, user, locale, existingOpenForRequests]) =>
        Effect.gen(function* () {
          const saveOpenForRequests = vi.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeOpenForRequests({ body: { openForRequests }, locale, method: 'POST', user })({
              isOpenForRequests: () => TE.right(existingOpenForRequests),
              saveOpenForRequests,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveOpenForRequests).toHaveBeenCalledWith(
            user.orcid,
            openForRequests === 'yes'
              ? {
                  value: true,
                  visibility: existingOpenForRequests.value ? existingOpenForRequests.visibility : 'restricted',
                }
              : { value: false },
          )
        }),
    )

    it.effect.prop(
      "when there isn't a career stage already",
      [fc.constantFrom('yes', 'no'), fc.user(), fc.supportedLocale()],
      ([openForRequests, user, locale]) =>
        Effect.gen(function* () {
          const saveOpenForRequests = vi.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeOpenForRequests({ body: { openForRequests }, locale, method: 'POST', user })({
              isOpenForRequests: () => TE.left('not-found'),
              saveOpenForRequests,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveOpenForRequests).toHaveBeenCalledWith(
            user.orcid,
            openForRequests === 'yes'
              ? {
                  value: true,
                  visibility: 'restricted',
                }
              : { value: false },
          )
        }),
    )
  })

  it.effect.prop(
    'when the form has been submitted but the career stage cannot be saved',
    [
      fc.constantFrom('yes', 'no'),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found'), fc.isOpenForRequests()),
    ],
    ([openForRequests, user, locale, existingOpenForRequests]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeOpenForRequests({ body: { openForRequests }, locale, method: 'POST', user })({
            isOpenForRequests: () => TE.fromEither(existingOpenForRequests),
            saveOpenForRequests: () => TE.left('unavailable'),
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
    'when the form has been submitted without setting open for requests',
    [fc.record({ openForRequests: fc.lorem() }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()],
    ([body, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeOpenForRequests({ body, locale, method: 'POST', user })({
            isOpenForRequests: shouldNotBeCalled,
            saveOpenForRequests: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeOpenForRequestsMatch.formatter, {}),
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeOpenForRequests({ body, locale, method, user: undefined })({
            isOpenForRequests: shouldNotBeCalled,
            saveOpenForRequests: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )
})
