import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Option, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/Router/NonEffectRouter/legacy-routes.ts'
import { preprintReviewsMatch, profileMatch } from '../../../src/routes.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('legacyRoutes', () => {
  describe("with an '/about/{uuid}' path", () => {
    test.prop([fc.uuid().map(uuid => Tuple.make(uuid, `/about/${uuid}`)), fc.supportedLocale(), fc.profileId()])(
      'when the profile ID is found',
      async ([uuid, path], locale, profile) => {
        const getProfileIdFromUuid = jest.fn<_.GetProfileIdFromUuidEnv['getProfileIdFromUuid']>(_ => TE.right(profile))

        const actual = await _.legacyRoutes(path)({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid,
          locale,
        })()

        expect(actual).toStrictEqual(
          Option.some({
            _tag: 'RedirectResponse',
            status: StatusCodes.MovedPermanently,
            location: format(profileMatch.formatter, { profile }),
          }),
        )
        expect(getProfileIdFromUuid).toHaveBeenCalledWith(uuid)
      },
    )

    test.prop([fc.uuid().map(uuid => `/about/${uuid}`), fc.supportedLocale()])(
      'when the profile ID is not found',
      async (path, locale) => {
        const actual = await _.legacyRoutes(path)({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid: () => TE.left('not-found'),
          locale,
        })()

        expect(actual).toStrictEqual(
          Option.some({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          }),
        )
      },
    )

    test.prop([fc.uuid().map(uuid => `/about/${uuid}`), fc.supportedLocale()])(
      'when the profile ID is unavailable',
      async (path, locale) => {
        const actual = await _.legacyRoutes(path)({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid: () => TE.left('unavailable'),
          locale,
        })()

        expect(actual).toStrictEqual(
          Option.some({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          }),
        )
      },
    )
  })

  describe("with a '/preprints/{uuid}' path", () => {
    test.prop([
      fc.uuid().map(uuid => Tuple.make(uuid, `/preprints/${uuid}`)),
      fc.supportedLocale(),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, path], locale, id) => {
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await _.legacyRoutes(path)({
        getPreprintIdFromUuid,
        getProfileIdFromUuid: shouldNotBeCalled,
        locale,
      })()

      expect(actual).toStrictEqual(
        Option.some({
          _tag: 'RedirectResponse',
          status: StatusCodes.MovedPermanently,
          location: format(preprintReviewsMatch.formatter, { id }),
        }),
      )
      expect(getPreprintIdFromUuid).toHaveBeenCalledWith(uuid)
    })

    test.prop([fc.uuid().map(uuid => `/preprints/${uuid}`), fc.supportedLocale()])(
      'when the ID is not found',
      async (path, locale) => {
        const actual = await _.legacyRoutes(path)({
          getPreprintIdFromUuid: () => TE.left('not-found'),
          getProfileIdFromUuid: shouldNotBeCalled,
          locale,
        })()

        expect(actual).toStrictEqual(
          Option.some({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          }),
        )
      },
    )

    test.prop([fc.uuid().map(uuid => `/preprints/${uuid}`), fc.supportedLocale()])(
      'when the ID is unavailable',
      async (path, locale) => {
        const actual = await _.legacyRoutes(path)({
          getPreprintIdFromUuid: () => TE.left('unavailable'),
          getProfileIdFromUuid: shouldNotBeCalled,
          locale,
        })()

        expect(actual).toStrictEqual(
          Option.some({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          }),
        )
      },
    )
  })

  describe("with a '/preprints/{uuid}/full-reviews/{uuid}' path", () => {
    test.prop([
      fc
        .tuple(fc.uuid(), fc.uuid())
        .map(([uuid1, uuid2]) => Tuple.make(uuid1, `/preprints/${uuid1}/full-reviews/${uuid2}`)),
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, path], locale, user, id) => {
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await _.legacyRoutes(path)({
        getPreprintIdFromUuid,
        getProfileIdFromUuid: shouldNotBeCalled,
        locale,
      })()

      expect(actual).toStrictEqual(
        Option.some({
          _tag: 'RedirectResponse',
          status: StatusCodes.MovedPermanently,
          location: format(preprintReviewsMatch.formatter, { id }),
        }),
      )
      expect(getPreprintIdFromUuid).toHaveBeenCalledWith(uuid)
    })

    test.prop([
      fc.tuple(fc.uuid(), fc.uuid()).map(([uuid1, uuid2]) => `/preprints/${uuid1}/full-reviews/${uuid2}`),
      fc.supportedLocale(),
    ])('when the ID is not found', async (path, locale) => {
      const actual = await _.legacyRoutes(path)({
        getPreprintIdFromUuid: () => TE.left('not-found'),
        getProfileIdFromUuid: shouldNotBeCalled,
        locale,
      })()

      expect(actual).toStrictEqual(
        Option.some({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        }),
      )
    })

    test.prop([
      fc.tuple(fc.uuid(), fc.uuid()).map(([uuid1, uuid2]) => `/preprints/${uuid1}/full-reviews/${uuid2}`),
      fc.supportedLocale(),
    ])('when the ID is unavailable', async (path, locale) => {
      const actual = await _.legacyRoutes(path)({
        getPreprintIdFromUuid: () => TE.left('unavailable'),
        getProfileIdFromUuid: shouldNotBeCalled,
        locale,
      })()

      expect(actual).toStrictEqual(
        Option.some({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        }),
      )
    })
  })

  describe("with a '/validate/{uuid}' path", () => {
    test.prop([
      fc.uuid().map(uuid => Tuple.make(uuid, `/validate/${uuid}`)),
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, path], locale, user, id) => {
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await _.legacyRoutes(path)({
        getPreprintIdFromUuid,
        getProfileIdFromUuid: shouldNotBeCalled,
        locale,
      })()

      expect(actual).toStrictEqual(
        Option.some({
          _tag: 'RedirectResponse',
          status: StatusCodes.MovedPermanently,
          location: format(preprintReviewsMatch.formatter, { id }),
        }),
      )
      expect(getPreprintIdFromUuid).toHaveBeenCalledWith(uuid)
    })

    test.prop([fc.uuid().map(uuid => `/validate/${uuid}`), fc.supportedLocale()])(
      'when the ID is not found',
      async (path, locale) => {
        const actual = await _.legacyRoutes(path)({
          getPreprintIdFromUuid: () => TE.left('not-found'),
          getProfileIdFromUuid: shouldNotBeCalled,
          locale,
        })()

        expect(actual).toStrictEqual(
          Option.some({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          }),
        )
      },
    )

    test.prop([fc.uuid().map(uuid => `/validate/${uuid}`), fc.supportedLocale()])(
      'when the ID is unavailable',
      async (path, locale) => {
        const actual = await _.legacyRoutes(path)({
          getPreprintIdFromUuid: () => TE.left('unavailable'),
          getProfileIdFromUuid: shouldNotBeCalled,
          locale,
        })()

        expect(actual).toStrictEqual(
          Option.some({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          }),
        )
      },
    )
  })
})
