import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import { changeResearchInterestsVisibilityMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-research-interests-visibility.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeResearchInterestsVisibility', () => {
  it.effect.prop(
    'when there is a logged in user',
    [
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.researchInterests(),
    ],
    ([body, method, user, locale, researchInterests]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeResearchInterestsVisibility({ body, locale, method, user })({
            deleteResearchInterests: shouldNotBeCalled,
            getResearchInterests: () => TE.of(researchInterests),
            saveResearchInterests: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeResearchInterestsVisibilityMatch.formatter, {}),
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
    [fc.researchInterestsVisibility(), fc.user(), fc.supportedLocale(), fc.researchInterests()],
    ([visibility, user, locale, existingResearchInterests]) =>
      Effect.gen(function* () {
        const saveResearchInterests = vi.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeResearchInterestsVisibility({
            body: { researchInterestsVisibility: visibility },
            locale,
            method: 'POST',
            user,
          })({
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
          value: existingResearchInterests.value,
          visibility,
        })
      }),
  )

  it.effect.prop(
    'when the form has been submitted but the visibility cannot be saved',
    [
      fc.record({ researchInterestsVisibility: fc.researchInterestsVisibility() }),
      fc.user(),
      fc.supportedLocale(),
      fc.researchInterests(),
    ],
    ([body, user, locale, researchInterests]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeResearchInterestsVisibility({ body, locale, method: 'POST', user })({
            deleteResearchInterests: shouldNotBeCalled,
            getResearchInterests: () => TE.of(researchInterests),
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
    'when the form has been submitted without setting visibility',
    [
      fc.record({ researchInterestsVisibility: fc.string() }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.researchInterests(),
    ],
    ([body, user, locale, researchInterests]) =>
      Effect.gen(function* () {
        const saveResearchInterests = vi.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.changeResearchInterestsVisibility({ body, locale, method: 'POST', user })({
            deleteResearchInterests: shouldNotBeCalled,
            getResearchInterests: () => TE.of(researchInterests),
            saveResearchInterests,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
          value: researchInterests.value,
          visibility: 'restricted',
        })
      }),
  )

  it.effect.prop(
    "there aren't research interests",
    [fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeResearchInterestsVisibility({ body, locale, method, user })({
            deleteResearchInterests: shouldNotBeCalled,
            getResearchInterests: () => TE.left('not-found'),
            saveResearchInterests: shouldNotBeCalled,
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
          _.changeResearchInterestsVisibility({ body, locale, method, user: undefined })({
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
