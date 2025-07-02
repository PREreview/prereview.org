import { Cookies, HttpServerResponse, UrlParams } from '@effect/platform'
import { Array, Boolean, Effect, HashMap, identity, Option, pipe, Schema } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import { FlashMessage, Locale } from '../Context.js'
import * as FeatureFlags from '../FeatureFlags.js'
import { OrcidOauth } from '../OrcidOauth.js'
import { TemplatePage } from '../TemplatePage.js'
import { PublicUrl } from '../public-url.js'
import { toPage, type Response } from '../response.js'
import * as Routes from '../routes.js'
import { OrcidLocale } from '../types/index.js'
import { UserOnboardingService } from '../user-onboarding.js'
import { LoggedInUser } from '../user.js'
import * as ConstructPageUrls from './ConstructPageUrls.js'
import * as Http from './Http.js'

export type { Response } from '../response.js'

export const toHttpServerResponse = (
  response: Response,
): Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  Locale | TemplatePage | OrcidOauth | PublicUrl | FeatureFlags.FeatureFlags
> => {
  return Effect.gen(function* () {
    if (response._tag === 'RedirectResponse') {
      return yield* HttpServerResponse.redirect(response.location, { status: response.status })
    }

    if (response._tag === 'FlashMessageResponse') {
      return yield* HttpServerResponse.redirect(response.location, {
        status: StatusCodes.SEE_OTHER,
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

      return yield* HttpServerResponse.redirect(location, { status: StatusCodes.MOVED_TEMPORARILY })
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

    const canChooseLocale = yield* FeatureFlags.canChooseLocale

    const links = Option.match(pageUrls, {
      onNone: Array.empty,
      onSome: pageUrls =>
        pipe(
          canChooseLocale ? pageUrls.localeUrls : HashMap.empty(),
          HashMap.reduce(Array.empty<(typeof Http.LinkHeaderSchema.Type)[number]>(), (links, url, locale) =>
            Array.append(links, { uri: url.href, rel: 'alternate', hreflang: locale }),
          ),
          Array.prepend({ uri: pageUrls.canonical.href, rel: 'canonical' }),
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
        onNone: () => identity,
        onSome: () =>
          HttpServerResponse.unsafeSetCookie('flash-message', '', { expires: new Date(1), httpOnly: true, path: '/' }),
      }),
      Array.match(links, {
        onEmpty: () => identity,
        onNonEmpty: links => HttpServerResponse.setHeader('Link', Schema.encodeSync(Http.LinkHeaderSchema)(links)),
      }),
      Boolean.match(allowRobots, {
        onFalse: () => HttpServerResponse.setHeader('X-Robots-Tag', 'none, noarchive'),
        onTrue: () => identity,
      }),
    )
  })
}

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
