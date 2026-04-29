import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeResearchInterestsMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-research-interests.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeResearchInterests', () => {
  it.effect.prop(
    'when there is a logged in user',
    [
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.researchInterests()),
    ],
    ([body, method, user, locale, researchInterests]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeResearchInterests({ body, locale, method, user })({
            deleteResearchInterests: shouldNotBeCalled,
            getResearchInterests: () => TE.fromEither(researchInterests),
            saveResearchInterests: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeResearchInterestsMatch.formatter, {}),
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
      'there are research interests already',
      [fc.nonEmptyString(), fc.user(), fc.supportedLocale(), fc.researchInterests()],
      ([researchInterests, user, locale, existingResearchInterests]) =>
        Effect.gen(function* () {
          const saveResearchInterests = vi.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeResearchInterests({ body: { researchInterests }, locale, method: 'POST', user })({
              deleteResearchInterests: shouldNotBeCalled,
              getResearchInterests: () => TE.right(existingResearchInterests),
              saveResearchInterests,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
            value: researchInterests,
            visibility: existingResearchInterests.visibility,
          })
        }),
    )

    it.effect.prop(
      "there aren't research interests already",
      [fc.nonEmptyString(), fc.user(), fc.supportedLocale()],
      ([researchInterests, user, locale]) =>
        Effect.gen(function* () {
          const saveResearchInterests = vi.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.changeResearchInterests({ body: { researchInterests }, locale, method: 'POST', user })({
              deleteResearchInterests: shouldNotBeCalled,
              getResearchInterests: () => TE.left('not-found'),
              saveResearchInterests,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
            value: researchInterests,
            visibility: 'restricted',
          })
        }),
    )
  })

  it.effect.prop(
    'when the form has been submitted but the research interests cannot be saved',
    [
      fc.record({ researchInterests: fc.nonEmptyString() }),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constantFrom('not-found', 'unavailable'), fc.researchInterests()),
    ],
    ([body, user, locale, existingResearchInterests]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeResearchInterests({ body, locale, method: 'POST', user })({
            deleteResearchInterests: () => TE.left('unavailable'),
            getResearchInterests: () => TE.fromEither(existingResearchInterests),
            saveResearchInterests: () => TE.left('unavailable'),
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
    'when the form has been submitted without setting research interests',
    [fc.record({ researchInterests: fc.constant('') }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()],
    ([body, user, locale]) =>
      Effect.gen(function* () {
        const deleteResearchInterests = vi.fn<_.Env['deleteResearchInterests']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeResearchInterests({ body, locale, method: 'POST', user })({
            deleteResearchInterests,
            getResearchInterests: shouldNotBeCalled,
            saveResearchInterests: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(deleteResearchInterests).toHaveBeenCalledWith(user.orcid)
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeResearchInterests({ body, locale, method, user: undefined })({
            deleteResearchInterests: shouldNotBeCalled,
            getResearchInterests: shouldNotBeCalled,
            saveResearchInterests: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )
})
