import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/oauth-start'
import type { CanConnectOrcidProfileEnv } from '../../src/feature-flags'
import { connectOrcidMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('connectOrcidStart', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.oauth(), fc.origin(), fc.user()])(
      'when ORCID can be connected',
      async (orcidOauth, publicUrl, user) => {
        const canConnectOrcidProfile = jest.fn<CanConnectOrcidProfileEnv['canConnectOrcidProfile']>(_ => true)

        const actual = await _.connectOrcidStart({ user })({ canConnectOrcidProfile, orcidOauth, publicUrl })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: new URL(
            `?${new URLSearchParams({
              client_id: orcidOauth.clientId,
              response_type: 'code',
              redirect_uri: new URL(format(connectOrcidMatch.formatter, {}), publicUrl).toString(),
              scope: '/activities/update /read-limited',
            }).toString()}`,
            orcidOauth.authorizeUrl,
          ),
        })
      },
    )

    test.prop([fc.oauth(), fc.origin(), fc.user()])(
      'when ORCID cannot be connected',
      async (orcidOauth, publicUrl, user) => {
        const actual = await _.connectOrcidStart({ user })({
          canConnectOrcidProfile: () => false,
          orcidOauth,
          publicUrl,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.NotFound,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test.prop([fc.oauth(), fc.origin()])('when the user is not logged in', async (orcidOauth, publicUrl) => {
    const actual = await _.connectOrcidStart({})({ canConnectOrcidProfile: shouldNotBeCalled, orcidOauth, publicUrl })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(connectOrcidMatch.formatter, {}),
    })
  })
})
