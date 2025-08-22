import { Cookies, HttpServerResponse, UrlParams } from '@effect/platform'
import cookieSignature from 'cookie-signature'
import { Array, Boolean, Effect, HashMap, identity, Option, pipe, Redacted, Schema } from 'effect'
import { format } from 'fp-ts-routing'
import { ExpressConfig, FlashMessage, Locale, SessionSecret } from '../Context.js'
import { OrcidOauth } from '../OrcidOauth.js'
import { PublicUrl } from '../public-url.js'
import { toPage, type ForceLogInResponse, type Response } from '../response.js'
import * as Routes from '../routes.js'
import * as StatusCodes from '../StatusCodes.js'
import { TemplatePage } from '../TemplatePage.js'
import { OrcidLocale, Uuid } from '../types/index.js'
import { UserOnboardingService } from '../user-onboarding.js'
import { LoggedInUser, UserSchema } from '../user.js'
import * as ConstructPageUrls from './ConstructPageUrls.js'
import * as Http from './Http.js'

export type { Response } from '../response.js'

export const toHttpServerResponse = (
  response: Response,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, Locale | TemplatePage | OrcidOauth | PublicUrl> => {
  return Effect.gen(function* () {
    if (response._tag === 'RedirectResponse') {
      return yield* HttpServerResponse.redirect(response.location, { status: response.status })
    }

    if (response._tag === 'FlashMessageResponse') {
      return yield* HttpServerResponse.redirect(response.location, {
        status: StatusCodes.SeeOther,
        cookies: Cookies.fromIterable([
          Cookies.unsafeMakeCookie('flash-message', response.message, { httpOnly: true, path: '/' }),
        ]),
      })
    }

    if (response._tag === 'LogInResponse') {
      const publicUrl = yield* PublicUrl

      const location = yield* generateAuthorizationRequestUrl({
        scope: '/authenticate',
        state: new URL(`${publicUrl.origin}${response.location}`).href,
      })

      return yield* HttpServerResponse.redirect(location, { status: StatusCodes.Found })
    }

    const locale = yield* Locale
    const publicUrl = yield* PublicUrl
    const templatePage = yield* TemplatePage
    const user = yield* Effect.serviceOption(LoggedInUser)
    const userOnboarding = yield* Effect.if(response._tag === 'PageResponse' && response.current === 'my-details', {
      onFalse: () => Effect.serviceOption(UserOnboardingService),
      onTrue: () => Effect.succeedNone,
    })
    const message = yield* Effect.serviceOption(FlashMessage)
    const allowRobots = response._tag !== 'TwoUpPageResponse' ? response.allowRobots !== false : true

    const pageUrls = ConstructPageUrls.constructPageUrls(response, publicUrl.origin, locale)

    const links = Option.match(pageUrls, {
      onNone: Array.empty,
      onSome: pageUrls =>
        pipe(
          pageUrls.localeUrls,
          HashMap.reduce(Array.empty<(typeof Http.LinkHeaderSchema.Type)[number]>(), (links, url, locale) =>
            Array.append(links, { uri: url.href, rel: 'alternate', hreflang: locale }),
          ),
          Array.prepend({ uri: pageUrls.canonical.href, rel: 'canonical' }),
          Array.append({ uri: pageUrls.xDefault.href, rel: 'alternate', hreflang: 'x-default' }),
        ),
    })

    return yield* pipe(
      templatePage(
        toPage({
          locale,
          message: Option.getOrUndefined(message),
          pageUrls: Option.getOrUndefined(pageUrls),
          response,
          userOnboarding: Option.getOrUndefined(userOnboarding),
          user: Option.getOrUndefined(user),
        }),
      ).toString(),
      HttpServerResponse.html,
      HttpServerResponse.setStatus(response._tag === 'TwoUpPageResponse' ? StatusCodes.OK : response.status),
      Option.match(message, {
        onNone: () => identity<HttpServerResponse.HttpServerResponse>,
        onSome: () =>
          HttpServerResponse.unsafeSetCookie('flash-message', '', { expires: new Date(1), httpOnly: true, path: '/' }),
      }),
      Array.match(links, {
        onEmpty: () => identity<HttpServerResponse.HttpServerResponse>,
        onNonEmpty: links => HttpServerResponse.setHeader('Link', Schema.encodeSync(Http.LinkHeaderSchema)(links)),
      }),
      Boolean.match(allowRobots, {
        onFalse: () => HttpServerResponse.setHeader('X-Robots-Tag', 'none, noarchive'),
        onTrue: () => identity<HttpServerResponse.HttpServerResponse>,
      }),
    )
  })
}

export const handleForceLogInResponse = Effect.fn(function* (response: ForceLogInResponse) {
  const secret = yield* SessionSecret
  const { sessionCookie, sessionStore } = yield* ExpressConfig

  const sessionId = yield* Uuid.generateUuid
  const session = { user: response.user }

  const encodedSessionId = yield* Schema.encode(Uuid.UuidSchema)(sessionId)
  const encodedSession = yield* Schema.encode(Schema.Struct({ user: UserSchema }))(session)

  yield* Effect.tryPromise(() => sessionStore.set(encodedSessionId, encodedSession))

  return yield* HttpServerResponse.redirect(format(Routes.homeMatch.formatter, {}), {
    status: StatusCodes.SeeOther,
    cookies: Cookies.fromIterable([
      Cookies.unsafeMakeCookie('flash-message', 'logged-in-demo', { httpOnly: true, path: '/' }),
      Cookies.unsafeMakeCookie(sessionCookie, cookieSignature.sign(encodedSessionId, Redacted.value(secret)), {
        httpOnly: true,
        path: '/',
      }),
    ]),
  })
}, Effect.orDie)

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
