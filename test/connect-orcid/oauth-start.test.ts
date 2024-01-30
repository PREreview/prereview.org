import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/oauth-start'
import { connectOrcidMatch } from '../../src/routes'
import * as fc from '../fc'

describe('connectOrcidStart', () => {
  test.prop([fc.oauth(), fc.origin(), fc.user()])('when the user is logged in', (orcidOauth, publicUrl, user) => {
    const actual = _.connectOrcidStart({ user })({ orcidOauth, publicUrl })

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

  test.prop([fc.oauth(), fc.origin()])('when the user is not logged in', (orcidOauth, publicUrl) => {
    const actual = _.connectOrcidStart({})({ orcidOauth, publicUrl })

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(connectOrcidMatch.formatter, {}),
    })
  })
})
