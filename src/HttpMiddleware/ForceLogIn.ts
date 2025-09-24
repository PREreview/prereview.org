import { HttpServerRequest, HttpServerResponse, UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../Context.ts'
import { OrcidOauth } from '../OrcidOauth.ts'
import { PublicUrl } from '../public-url.ts'
import * as Routes from '../routes.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { OrcidLocale } from '../types/index.ts'

export const forceLogIn = Effect.gen(function* () {
  const publicUrl = yield* PublicUrl
  const request = yield* HttpServerRequest.HttpServerRequest

  const location = yield* generateAuthorizationRequestUrl({
    scope: '/authenticate',
    state: new URL(`${publicUrl.origin}${request.url}`).href,
  })

  return yield* HttpServerResponse.redirect(location, { status: StatusCodes.Found })
})

function generateAuthorizationRequestUrl({
  scope,
  state,
}: {
  scope: string
  state?: string
}): Effect.Effect<URL, never, OrcidOauth | Locale | PublicUrl> {
  return Effect.gen(function* () {
    const orcidOauth = yield* OrcidOauth
    const publicUrl = yield* PublicUrl
    const locale = yield* Locale

    const redirectUri = new URL(
      `${publicUrl.origin}${format(Routes.orcidCodeMatch.formatter, { code: 'code', state: 'state' })}`,
    )
    redirectUri.search = ''

    const query = UrlParams.fromInput({
      client_id: orcidOauth.clientId,
      lang: OrcidLocale.fromSupportedLocale(locale),
      response_type: 'code',
      redirect_uri: redirectUri.href,
      scope,
      state,
    })

    return new URL(`${orcidOauth.authorizeUrl}?${UrlParams.toString(query)}`)
  })
}
