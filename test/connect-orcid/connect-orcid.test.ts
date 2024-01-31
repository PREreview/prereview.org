import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/connect-orcid'
import type { CanConnectOrcidProfileEnv } from '../../src/feature-flags'
import type { GetOrcidTokenEnv } from '../../src/orcid-token'
import { connectOrcidMatch, connectOrcidStartMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('connectOrcid', () => {
  describe('when the user is logged in', () => {
    describe('when ORCID can be connected', () => {
      test.prop([fc.user()])('when ORCID is not already connected', async user => {
        const canConnectOrcidProfile = jest.fn<CanConnectOrcidProfileEnv['canConnectOrcidProfile']>(_ => true)
        const getOrcidToken = jest.fn<GetOrcidTokenEnv['getOrcidToken']>(_ => TE.left('not-found'))

        const actual = await _.connectOrcid({ user })({
          canConnectOrcidProfile,
          getOrcidToken,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(connectOrcidMatch.formatter, {}),
          status: Status.OK,
          title: expect.stringContaining('Connect'),
          main: expect.stringContaining('Connect'),
          skipToLabel: 'main',
          js: [],
        })
        expect(canConnectOrcidProfile).toHaveBeenCalledWith(user)
        expect(getOrcidToken).toHaveBeenCalledWith(user.orcid)
      })

      test.prop([fc.user(), fc.orcidToken()])('when ORCID is connected', async (user, orcidToken) => {
        const actual = await _.connectOrcid({ user })({
          canConnectOrcidProfile: () => true,
          getOrcidToken: () => TE.right(orcidToken),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(connectOrcidStartMatch.formatter, {}),
        })
      })

      test.prop([fc.user()])("when we can't load the ORCID token", async user => {
        const actual = await _.connectOrcid({ user })({
          canConnectOrcidProfile: () => true,
          getOrcidToken: () => TE.left('unavailable'),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      })
    })

    test.prop([fc.user()])('when ORCID cannot be connected', async user => {
      const actual = await _.connectOrcid({ user })({
        canConnectOrcidProfile: () => false,
        getOrcidToken: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test('when the user is not logged in', async () => {
    const actual = await _.connectOrcid({})({
      canConnectOrcidProfile: shouldNotBeCalled,
      getOrcidToken: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(connectOrcidMatch.formatter, {}),
    })
  })
})
