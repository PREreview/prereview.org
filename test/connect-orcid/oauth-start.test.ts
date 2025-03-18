import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/oauth-start.js'
import { connectOrcidMatch } from '../../src/routes.js'
import * as fc from '../fc.js'

describe('connectOrcidStart', () => {
  test.prop([fc.oauth(), fc.origin(), fc.user(), fc.supportedLocale()])(
    'when the user is logged in',
    async (orcidOauth, publicUrl, user, locale) => {
      const actual = await _.connectOrcidStart({ user })({ locale, orcidOauth, publicUrl })()

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

  test.prop([fc.oauth(), fc.origin(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (orcidOauth, publicUrl, locale) => {
      const actual = await _.connectOrcidStart({})({ locale, orcidOauth, publicUrl })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(connectOrcidMatch.formatter, {}),
      })
    },
  )
})
