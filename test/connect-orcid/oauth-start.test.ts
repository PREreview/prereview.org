import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/oauth-start.js'
import { connectOrcidMatch } from '../../src/routes.js'
import * as fc from '../fc.js'

describe('connectOrcidStart', () => {
  test.prop([fc.oauth(), fc.origin(), fc.user()])('when the user is logged in', async (orcidOauth, publicUrl, user) => {
    const actual = await _.connectOrcidStart({ user })({ orcidOauth, publicUrl })()

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
  })

  test.prop([fc.oauth(), fc.origin()])('when the user is not logged in', async (orcidOauth, publicUrl) => {
    const actual = await _.connectOrcidStart({})({ orcidOauth, publicUrl })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(connectOrcidMatch.formatter, {}),
    })
  })
})
