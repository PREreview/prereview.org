import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/connect-orcid/connect-orcid.ts'
import type { GetOrcidTokenEnv } from '../../src/orcid-token.ts'
import { connectOrcidMatch, connectOrcidStartMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('connectOrcid', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user(), fc.supportedLocale()])('when ORCID is not already connected', async (user, locale) => {
      const getOrcidToken = jest.fn<GetOrcidTokenEnv['getOrcidToken']>(_ => TE.left('not-found'))

      const actual = await _.connectOrcid({ locale, user })({
        getOrcidToken,
      })()

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
    })

    test.prop([fc.user(), fc.supportedLocale(), fc.orcidToken()])(
      'when ORCID is connected',
      async (user, locale, orcidToken) => {
        const actual = await _.connectOrcid({ locale, user })({
          getOrcidToken: () => TE.right(orcidToken),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(connectOrcidStartMatch.formatter, {}),
        })
      },
    )

    test.prop([fc.user(), fc.supportedLocale()])("when we can't load the ORCID token", async (user, locale) => {
      const actual = await _.connectOrcid({ locale, user })({
        getOrcidToken: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.supportedLocale()])('when the user is not logged in', async locale => {
    const actual = await _.connectOrcid({ locale })({
      getOrcidToken: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(connectOrcidMatch.formatter, {}),
    })
  })
})
