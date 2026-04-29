import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { GetOrcidTokenEnv } from '../../../src/orcid-token.ts'
import { connectOrcidMatch, connectOrcidStartMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/connect-orcid/connect-orcid.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('connectOrcid', () => {
  describe('when the user is logged in', () => {
    it.effect.prop('when ORCID is not already connected', [fc.user(), fc.supportedLocale()], ([user, locale]) =>
      Effect.gen(function* () {
        const getOrcidToken = vi.fn<GetOrcidTokenEnv['getOrcidToken']>(_ => TE.left('not-found'))

        const actual = yield* Effect.promise(
          _.connectOrcid({ locale, user })({
            getOrcidToken,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(connectOrcidMatch.formatter, {}),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(getOrcidToken).toHaveBeenCalledWith(user.orcid)
      }),
    )

    it.effect.prop(
      'when ORCID is connected',
      [fc.user(), fc.supportedLocale(), fc.orcidToken()],
      ([user, locale, orcidToken]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.connectOrcid({ locale, user })({
              getOrcidToken: () => TE.right(orcidToken),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(connectOrcidStartMatch.formatter, {}),
          })
        }),
    )

    it.effect.prop("when we can't load the ORCID token", [fc.user(), fc.supportedLocale()], ([user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.connectOrcid({ locale, user })({
            getOrcidToken: () => TE.left('unavailable'),
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
  })

  it.effect.prop('when the user is not logged in', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.connectOrcid({ locale })({
          getOrcidToken: shouldNotBeCalled,
        }),
      )

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(connectOrcidMatch.formatter, {}),
      })
    }),
  )
})
