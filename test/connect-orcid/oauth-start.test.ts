import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/connect-orcid/oauth-start.ts'
import { connectOrcidMatch } from '../../src/routes.ts'
import { OrcidLocale } from '../../src/types/index.ts'
import * as fc from '../fc.ts'

describe('connectOrcidStart', () => {
  test.prop([fc.oauth(), fc.origin(), fc.user(), fc.supportedLocale()])(
    'when the user is logged in',
    async (orcidOauth, publicUrl, user, locale) => {
      const actual = await _.connectOrcidStart({ locale, user })({ orcidOauth, publicUrl })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: new URL(
          `?${new URLSearchParams({
            client_id: orcidOauth.clientId,
            lang: OrcidLocale.fromSupportedLocale(locale),
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
      const actual = await _.connectOrcidStart({ locale })({ orcidOauth, publicUrl })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(connectOrcidMatch.formatter, {}),
      })
    },
  )
})
