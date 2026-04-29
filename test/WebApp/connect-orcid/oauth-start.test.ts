import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { describe, expect } from 'vitest'
import { connectOrcidMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidLocale } from '../../../src/types/index.ts'
import * as _ from '../../../src/WebApp/connect-orcid/oauth-start.ts'
import * as fc from '../../fc.ts'

describe('connectOrcidStart', () => {
  it.effect.prop(
    'when the user is logged in',
    [fc.oauth(), fc.origin(), fc.user(), fc.supportedLocale()],
    ([orcidOauth, publicUrl, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(_.connectOrcidStart({ locale, user })({ orcidOauth, publicUrl }))

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
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.oauth(), fc.origin(), fc.supportedLocale()],
    ([orcidOauth, publicUrl, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(_.connectOrcidStart({ locale })({ orcidOauth, publicUrl }))

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(connectOrcidMatch.formatter, {}),
        })
      }),
  )
})
