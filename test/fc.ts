import {
  HttpBody,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
  type HttpMethod,
  HttpServerRequest,
  UrlParams,
} from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { animals, colors } from 'anonymus'
import { capitalCase } from 'case-anything'
import { mod11_2 } from 'cdigit'
import { Doi, isDoi } from 'doi-ts'
import { Array, DateTime, Duration, Either, HashSet, Option, Predicate, Tuple } from 'effect'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import * as fc from 'fast-check'
import type { Json, JsonRecord } from 'fp-ts/lib/Json.js'
import type * as H from 'hyper-ts'
import { Status } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import { ExpressConnection } from 'hyper-ts/lib/express.js'
import ISO6391, { type LanguageCode } from 'iso-639-1'
import {
  type Body,
  type Headers as RequestHeaders,
  type RequestMethod,
  createRequest,
  createResponse,
} from 'node-mocks-http'
import { type Orcid, isOrcid } from 'orcid-id-ts'
import { Uuid } from 'uuid-ts'
import type {
  AssignedAuthorInvite,
  AuthorInvite,
  CompletedAuthorInvite,
  DeclinedAuthorInvite,
  OpenAuthorInvite,
} from '../src/author-invite.js'
import type { CareerStage } from '../src/career-stage.js'
import * as Comments from '../src/Comments/index.js'
import type { OrcidOAuthEnv } from '../src/connect-orcid/index.js'
import {
  type ContactEmailAddress,
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../src/contact-email-address.js'
import type { CrossrefPreprintId as LegacyCrossrefPreprintId } from '../src/crossref.js'
import type { CrossrefPreprintId } from '../src/Crossref/PreprintId.js'
import type { DatacitePreprintId as LegacyDatacitePreprintId } from '../src/datacite.js'
import type { DatacitePreprintId } from '../src/Datacite/PreprintId.js'
import * as DatasetReviews from '../src/DatasetReviews/index.js'
import * as Datasets from '../src/Datasets/index.js'
import type { Email } from '../src/email.js'
import { type Html, type PlainText, sanitizeHtml, html as toHtml, plainText as toPlainText } from '../src/html.js'
import type { IsOpenForRequests } from '../src/is-open-for-requests.js'
import type { JapanLinkCenterPreprintId } from '../src/JapanLinkCenter/PreprintId.js'
import type { Languages } from '../src/languages.js'
import {
  type SupportedLocale,
  SupportedLocales,
  type UserSelectableLanguage,
  UserSelectableLanguages,
  type UserSelectableLocale,
  UserSelectableLocales,
} from '../src/locales/index.js'
import type { Location } from '../src/location.js'
import assets from '../src/manifest.json' with { type: 'json' }
import type { OrcidToken } from '../src/orcid-token.js'
import type { Preprint, PreprintTitle } from '../src/preprint.js'
import { Prereview } from '../src/Prereview.js'
import type { ResearchInterests } from '../src/research-interests.js'
import {
  type FlashMessageResponse,
  FlashMessageSchema,
  type LogInResponse,
  type PageResponse,
  type RedirectResponse,
  type StreamlinePageResponse,
  type TwoUpPageResponse,
} from '../src/response.js'
import type {
  CompletedReviewRequest,
  IncompleteReviewRequest,
  ReviewRequest,
  ReviewRequestPreprintId,
} from '../src/review-request.js'
import type { SlackUserId } from '../src/slack-user-id.js'
import type { SlackUser } from '../src/slack-user.js'
import {
  type CacheableStatusCodes,
  type NonCacheableStatusCodes,
  isCacheable,
  isNonCacheable,
} from '../src/status-code.js'
import { type ClubId, clubIds } from '../src/types/club-id.js'
import { EmailAddress } from '../src/types/EmailAddress.js'
import { type FieldId, fieldIds } from '../src/types/field.js'
import { OrcidLocale, ProfileId } from '../src/types/index.js'
import { type NonEmptyString, isNonEmptyString } from '../src/types/NonEmptyString.js'
import {
  AdvancePreprintId,
  AfricarxivFigsharePreprintId,
  AfricarxivOsfPreprintId,
  type AfricarxivPreprintId,
  AfricarxivUbuntunetPreprintId,
  AfricarxivZenodoPreprintId,
  ArcadiaSciencePreprintId,
  ArxivPreprintId,
  AuthoreaPreprintId,
  BiorxivOrMedrxivPreprintId,
  BiorxivPreprintId,
  ChemrxivPreprintId,
  CurvenotePreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  type IndeterminatePreprintId,
  type IndeterminatePreprintIdWithDoi,
  JxivPreprintId,
  LifecycleJournalPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  NeurolibrePreprintId,
  OsfOrLifecycleJournalPreprintId,
  OsfPreprintId,
  OsfPreprintsPreprintId,
  PhilsciPreprintId,
  type PreprintId,
  type PreprintIdWithDoi,
  PreprintsorgPreprintId,
  PsyarxivPreprintId,
  PsychArchivesPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  ScienceOpenPreprintId,
  SocarxivPreprintId,
  SsrnPreprintId,
  TechrxivPreprintId,
  VerixivPreprintId,
  ZenodoOrAfricarxivPreprintId,
  ZenodoPreprintId,
  isPreprintDoi,
} from '../src/types/preprint-id.js'
import { Pseudonym } from '../src/types/Pseudonym.js'
import { type SubfieldId, subfieldIds } from '../src/types/subfield.js'
import type { UserOnboarding } from '../src/user-onboarding.js'
import type { User } from '../src/user.js'

export type Arbitrary<T> = fc.Arbitrary<T>

export const {
  anything,
  array,
  boolean,
  date,
  dictionary,
  integer,
  lorem,
  oneof,
  option,
  record,
  string,
  tuple,
  uniqueArray,
  webUrl,
} = fc

export function constant<const T>(value: T): Arbitrary<T> {
  return fc.constant(value)
}

export function constantFrom<const T extends Array<unknown>>(...values: T): Arbitrary<T[number]> {
  return fc.constantFrom(...values)
}

export const hashSet = <A>(
  arb: fc.Arbitrary<A>,
  constraints?: fc.UniqueArraySharedConstraints,
): fc.Arbitrary<HashSet.HashSet<A>> => fc.uniqueArray(arb, constraints).map(HashSet.fromIterable)

const some = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Option.Option<A>> => arb.map(Option.some)

export const maybe = <A>(someArb: fc.Arbitrary<A>): fc.Arbitrary<Option.Option<A>> =>
  fc.oneof(some(someArb), fc.constant(Option.none()))

const left = <E>(arb: fc.Arbitrary<E>): fc.Arbitrary<Either.Either<never, E>> => arb.map(Either.left)

const right = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Either.Either<A>> => arb.map(Either.right)

export const either = <E, A>(leftArb: fc.Arbitrary<E>, rightArb: fc.Arbitrary<A>): fc.Arbitrary<Either.Either<A, E>> =>
  fc.oneof(left(leftArb), right(rightArb))

export const urlParams = (params?: fc.Arbitrary<UrlParams.Input>): fc.Arbitrary<UrlParams.UrlParams> =>
  (params ?? fc.webQueryParameters().map(params => new URLSearchParams(params))).map(params =>
    UrlParams.fromInput(params),
  )

export const durationInput = (): fc.Arbitrary<Duration.DurationInput> => fc.integer({ min: 0 }).map(Duration.seconds)

export const json = (): fc.Arbitrary<Json> => fc.jsonValue() as fc.Arbitrary<Json>

export const jsonRecord = (): fc.Arbitrary<JsonRecord> => fc.dictionary(fc.string(), json())

export const alphanumeric = (): fc.Arbitrary<string> =>
  fc.mapToConstant(
    { num: 26, build: v => String.fromCharCode(v + 0x61) },
    { num: 10, build: v => String.fromCharCode(v + 0x30) },
  )

export const invisibleCharacter = (): fc.Arbitrary<string> => fc.oneof(lineTerminator(), whiteSpaceCharacter())

export const lineTerminator = (): fc.Arbitrary<string> => constantFrom('\n', '\r', '\u2028', '\u2029')

export const whiteSpaceCharacter = (): fc.Arbitrary<string> =>
  constantFrom(
    '\t',
    '\v',
    '\f',
    ' ',
    '\ufeff',
    '\u00a0',
    '\u1680',
    '\u2000',
    '\u2001',
    '\u2002',
    '\u2003',
    '\u2004',
    '\u2005',
    '\u2006',
    '\u2007',
    '\u2008',
    '\u2009',
    '\u200a',
    '\u202f',
    '\u205f',
    '\u3000',
  )

export const partialRecord = <T, TConstraints extends { requiredKeys: Array<keyof T> } | undefined>(
  recordModel: { [K in keyof T]: fc.Arbitrary<T[K]> },
  constraints?: TConstraints,
): fc.Arbitrary<
  fc.RecordValue<{ [K in keyof T]: T[K] }, TConstraints extends undefined ? { requiredKeys: [] } : TConstraints>
> =>
  fc
    .constantFrom(
      ...Object.getOwnPropertyNames(recordModel).filter(
        property => !(constraints?.requiredKeys.includes(property as keyof T) ?? false),
      ),
    )
    .chain(omit =>
      fc.record(
        Object.fromEntries(Object.entries(recordModel).filter(([key]) => key !== omit)) as never,
        (constraints ?? { requiredKeys: [] }) as never,
      ),
    )

export const uuid = (): fc.Arbitrary<Uuid> => fc.uuid().map(Uuid)

export const locale = (): fc.Arbitrary<string> =>
  constantFrom(
    'de',
    'de-AT',
    'de-DE-u-co-phonebk',
    'en',
    'en-001',
    'en-GB-u-ca-islamic',
    'en-US',
    'en-emodeng',
    'es',
    'es-419',
    'km',
    'km-Khmr-KH',
    'km-fonipa',
    'hi',
    'th',
    'th-TH-u-nu-thai',
    'zh',
    'zh-CN',
    'zh-Hans-CN',
  )

export const supportedLocale = (): fc.Arbitrary<SupportedLocale> =>
  constantFrom(...Array.fromIterable(SupportedLocales))

export const userSelectableLocale = (): fc.Arbitrary<UserSelectableLocale> =>
  constantFrom(...Array.fromIterable(UserSelectableLocales))

export const userSelectableLanguage = (): fc.Arbitrary<UserSelectableLanguage> =>
  constantFrom(...Array.fromIterable(UserSelectableLanguages))

export const pageResponse = ({
  allowRobots,
  canonical,
  status,
}: {
  allowRobots?: fc.Arbitrary<PageResponse['allowRobots']>
  canonical?: fc.Arbitrary<PageResponse['canonical']>
  status?: fc.Arbitrary<PageResponse['status']>
} = {}): fc.Arbitrary<PageResponse> =>
  fc.record({
    _tag: constant('PageResponse'),
    canonical:
      canonical ??
      fc.option(
        url().map(url => url.pathname),
        { nil: undefined },
      ),
    current: fc.option(
      constantFrom(
        'about-us',
        'clubs',
        'code-of-conduct',
        'edia-statement',
        'funding',
        'home',
        'how-to-use',
        'live-reviews',
        'menu',
        'my-details',
        'partners',
        'people',
        'privacy-policy',
        'reviews',
        'trainings',
      ),
      { nil: undefined },
    ),
    skipToLabel: constant('main'),
    status: status ?? statusCode(),
    title: plainText(),
    description: fc.option(plainText(), { nil: undefined }),
    main: html(),
    js: fc.array(
      js().filter(
        (js): js is Exclude<EndsWith<keyof typeof assets, '.js'>, 'expander-button.js' | 'skip-link.js'> =>
          !['expander-button.js', 'skip-link.js'].includes(js),
      ),
    ),
    allowRobots: allowRobots ?? fc.option(constant(false), { nil: undefined }),
  })

export const streamlinePageResponse = ({
  allowRobots,
  canonical,
  status,
}: {
  allowRobots?: fc.Arbitrary<StreamlinePageResponse['allowRobots']>
  canonical?: fc.Arbitrary<StreamlinePageResponse['canonical']>
  status?: fc.Arbitrary<StreamlinePageResponse['status']>
} = {}): fc.Arbitrary<StreamlinePageResponse> =>
  fc.record({
    _tag: constant('StreamlinePageResponse'),
    canonical: canonical ?? fc.option(fc.string(), { nil: undefined }),
    current: fc.option(
      constantFrom(
        'about-us',
        'clubs',
        'code-of-conduct',
        'edia-statement',
        'funding',
        'home',
        'how-to-use',
        'live-reviews',
        'menu',
        'my-details',
        'partners',
        'people',
        'privacy-policy',
        'reviews',
        'trainings',
      ),
      { nil: undefined },
    ),
    skipToLabel: constant('main'),
    status: status ?? statusCode(),
    title: plainText(),
    description: fc.option(plainText(), { nil: undefined }),
    main: html(),
    js: fc.array(
      js().filter(
        (js): js is Exclude<EndsWith<keyof typeof assets, '.js'>, 'expander-button.js' | 'skip-link.js'> =>
          !['expander-button.js', 'skip-link.js'].includes(js),
      ),
    ),
    allowRobots: allowRobots ?? fc.option(constant(false), { nil: undefined }),
  })

export const twoUpPageResponse = (): fc.Arbitrary<TwoUpPageResponse> =>
  fc.record({
    _tag: constant('TwoUpPageResponse'),
    canonical: url().map(url => url.pathname),
    title: plainText(),
    description: fc.oneof(plainText(), constant(undefined)),
    h1: html(),
    aside: html(),
    main: html(),
  })

export const redirectResponse = (): fc.Arbitrary<RedirectResponse> =>
  fc.record({
    _tag: constant('RedirectResponse'),
    status: constantFrom(Status.SeeOther, Status.Found, Status.MovedPermanently),
    location: fc.oneof(fc.webPath(), url()),
  })

export const flashMessage = (): fc.Arbitrary<typeof FlashMessageSchema.Type> =>
  fc.constantFrom(...FlashMessageSchema.literals)

export const flashMessageResponse = (): fc.Arbitrary<FlashMessageResponse> =>
  fc.record({
    _tag: constant('FlashMessageResponse'),
    location: fc.webPath(),
    message: flashMessage(),
  })

export const logInResponse = (): fc.Arbitrary<LogInResponse> =>
  fc.record({
    _tag: constant('LogInResponse'),
    location: fc.webPath(),
  })

const asset = (): fc.Arbitrary<keyof typeof assets> =>
  constantFrom(...(Object.keys(assets) as Array<keyof typeof assets>))

const js = (): fc.Arbitrary<EndsWith<keyof typeof assets, '.js'>> =>
  asset().filter((asset): asset is EndsWith<typeof asset, '.js'> => asset.endsWith('.js'))

export const emailAddress = (): fc.Arbitrary<EmailAddress> => fc.emailAddress().map(EmailAddress)

export const contactEmailAddress = (): fc.Arbitrary<ContactEmailAddress> =>
  fc.oneof(unverifiedContactEmailAddress(), verifiedContactEmailAddress())

export const unverifiedContactEmailAddress = (): fc.Arbitrary<UnverifiedContactEmailAddress> =>
  fc
    .record({
      value: emailAddress(),
      verificationToken: uuid(),
    })
    .map(data => new UnverifiedContactEmailAddress(data))

export const verifiedContactEmailAddress = (): fc.Arbitrary<VerifiedContactEmailAddress> =>
  fc
    .record({
      value: emailAddress(),
    })
    .map(data => new VerifiedContactEmailAddress(data))

export const error = (): fc.Arbitrary<Error> => fc.string().map(error => new Error(error))

export const httpBody = (): fc.Arbitrary<HttpBody.HttpBody> => fc.string().map(HttpBody.text)

export const httpClientRequest = ({
  method,
  url: _url,
}: {
  method?: fc.Arbitrary<HttpClientRequest.HttpClientRequest['method']>
  url?: fc.Arbitrary<string | URL>
} = {}): fc.Arbitrary<HttpClientRequest.HttpClientRequest> =>
  fc
    .record({
      body: httpBody(),
      headers: headers(),
      method: method ?? requestMethod(),
      url: _url ?? url(),
    })
    .map(({ method, url, ...options }) => HttpClientRequest.make(method)(url, options))

export const httpClientResponse = ({
  request,
  ...response
}: {
  request?: fc.Arbitrary<HttpClientRequest.HttpClientRequest>
} & Parameters<typeof fetchResponse>[0] = {}): fc.Arbitrary<HttpClientResponse.HttpClientResponse> =>
  fc
    .record({
      request: request ?? httpClientRequest(),
      response: fetchResponse(response),
    })
    .map(({ request, response }) => HttpClientResponse.fromWeb(request, response))

export const httpClientRequestError = ({
  reason,
}: {
  reason?: fc.Arbitrary<HttpClientError.RequestError['reason']>
} = {}): fc.Arbitrary<HttpClientError.RequestError> =>
  fc
    .record({
      request: httpClientRequest(),
      reason: reason ?? constantFrom('Transport', 'Encode', 'InvalidUrl'),
    })
    .map(args => new HttpClientError.RequestError(args))

export const httpClientResponseError = (): fc.Arbitrary<HttpClientError.ResponseError> =>
  fc
    .record({
      request: httpClientRequest(),
      response: httpClientResponse(),
      reason: constantFrom('StatusCode', 'Decode', 'EmptyBody'),
    })
    .map(args => new HttpClientError.ResponseError(args))

export const httpClientError = (): fc.Arbitrary<HttpClientError.HttpClientError> =>
  fc.oneof(httpClientRequestError(), httpClientResponseError())

export const httpServerRequest = (
  ...args: Parameters<typeof fetchRequest>
): fc.Arbitrary<HttpServerRequest.HttpServerRequest> => fetchRequest(...args).map(HttpServerRequest.fromWeb)

export const cookieName = (): fc.Arbitrary<string> => fc.lorem({ maxCount: 1 })

export const html = (): fc.Arbitrary<Html> => fc.lorem().map(text => toHtml`<p>${text}</p>`)

export const sanitisedHtml = (): fc.Arbitrary<Html> => fc.string().map(sanitizeHtml)

export const plainText = (): fc.Arbitrary<PlainText> => fc.string().map(toPlainText)

export const oauth = (): fc.Arbitrary<Omit<OrcidOAuthEnv['orcidOauth'] & OAuthEnv['oauth'], 'redirectUri'>> =>
  fc.record({
    authorizeUrl: url(),
    clientId: fc.string(),
    clientSecret: fc.string(),
    revokeUrl: url(),
    tokenUrl: url(),
  })

export const doiRegistrant = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), minLength: 2 }),
      fc.array(fc.string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), minLength: 1 })),
    )
    .map(([one, two]) => [one, ...two].join('.'))

export const doi = <R extends string>(withRegistrant?: fc.Arbitrary<R>): fc.Arbitrary<Doi<R>> =>
  fc
    .tuple(withRegistrant ?? doiRegistrant(), fc.string({ unit: 'grapheme', minLength: 1 }))
    .map(([prefix, suffix]) => `10.${prefix}/${suffix}`)
    .filter(isDoi as Predicate.Refinement<unknown, Doi<R>>)

export const nonPreprintDoi = (): fc.Arbitrary<Doi> => doi().filter(Predicate.not(isPreprintDoi))

export const preprintDoi = (): fc.Arbitrary<PreprintIdWithDoi['value']> => preprintIdWithDoi().map(id => id.value)

export const nonPreprintUrl = (): fc.Arbitrary<URL> => fc.oneof(url(), unsupportedPreprintUrl())

export const supportedPreprintUrl = (): fc.Arbitrary<[URL, Array.NonEmptyReadonlyArray<IndeterminatePreprintId>]> =>
  fc.oneof(
    fc
      .oneof(
        africarxivPreprintUrl(),
        arxivPreprintUrl(),
        authoreaPreprintUrl(),
        biorxivPreprintUrl(),
        edarxivPreprintUrl(),
        engrxivPreprintUrl(),
        jxivPreprintUrl(),
        medrxivPreprintUrl(),
        metaarxivPreprintUrl(),
        neurolibrePreprintUrl(),
        philsciPreprintUrl(),
        preprintsorgPreprintUrl(),
        psyarxivPreprintUrl(),
        researchSquarePreprintUrl(),
        scieloPreprintUrl(),
        scienceOpenPreprintUrl(),
        socarxivPreprintUrl(),
        techrxivPreprintUrl(),
      )
      .map(([url, id]) => Tuple.make(url, Array.of(id))),
    lifecycleJournalPreprintUrl(),
    osfPreprintUrl(),
    osfPreprintsPreprintUrl(),
  )

export const unsupportedPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.oneof(chemrxivPreprintUrl(), eartharxivPreprintUrl(), ecoevorxivPreprintUrl())

export const crossrefPreprintDoi = (): fc.Arbitrary<CrossrefPreprintId['value'] | LegacyCrossrefPreprintId['value']> =>
  crossrefPreprintId().map(id => id.value)

export const legacyCrossrefPreprintDoi = (): fc.Arbitrary<LegacyCrossrefPreprintId['value']> =>
  legacyCrossrefPreprintId().map(id => id.value)

export const datacitePreprintDoi = (): fc.Arbitrary<DatacitePreprintId['value'] | LegacyDatacitePreprintId['value']> =>
  datacitePreprintId().map(id => id.value)

export const legacyDatacitePreprintDoi = (): fc.Arbitrary<LegacyDatacitePreprintId['value']> =>
  legacyDatacitePreprintId().map(id => id.value)

export const japanLinkCenterPreprintDoi = (): fc.Arbitrary<JapanLinkCenterPreprintId['value']> =>
  japanLinkCenterPreprintId().map(id => id.value)

export const advancePreprintId = (): fc.Arbitrary<AdvancePreprintId> =>
  doi(constant('31124')).map(doi => new AdvancePreprintId({ value: doi }))

export const africarxivPreprintId = (): fc.Arbitrary<AfricarxivPreprintId> =>
  fc.oneof(
    africarxivFigsharePreprintId(),
    africarxivOsfPreprintId(),
    africarxivUbuntunetPreprintId(),
    africarxivZenodoPreprintId(),
  )

export const africarxivPreprintUrl = (): fc.Arbitrary<[URL, AfricarxivPreprintId]> =>
  fc.oneof(africarxivFigsharePreprintUrl(), africarxivOsfPreprintUrl())

export const africarxivFigsharePreprintId = (): fc.Arbitrary<AfricarxivFigsharePreprintId> =>
  doi(constant('6084')).map(doi => new AfricarxivFigsharePreprintId({ value: doi }))

export const africarxivFigsharePreprintUrl = (): fc.Arbitrary<[URL, AfricarxivFigsharePreprintId]> =>
  fc
    .tuple(
      fc.string({ unit: fc.oneof(alphanumeric(), constant('-')), minLength: 1 }),
      fc.string({ unit: fc.oneof(alphanumeric(), constantFrom('_')), minLength: 1 }),
      fc.integer({ min: 1 }),
    )
    .map(([type, title, id]) => [
      new URL(`https://africarxiv.figshare.com/articles/${type}/${title}/${id}`),
      new AfricarxivFigsharePreprintId({ value: Doi(`10.6084/m9.figshare.${id}.v1`) }),
    ])

export const africarxivOsfPreprintId = (): fc.Arbitrary<AfricarxivOsfPreprintId> =>
  doi(constant('31730')).map(doi => new AfricarxivOsfPreprintId({ value: doi }))

export const africarxivOsfPreprintUrl = (): fc.Arbitrary<[URL, AfricarxivOsfPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/africarxiv/${id}`),
      new AfricarxivOsfPreprintId({ value: Doi(`10.31730/osf.io/${id}`) }),
    ])

export const africarxivUbuntunetPreprintId = (): fc.Arbitrary<AfricarxivUbuntunetPreprintId> =>
  doi(constant('60763')).map(doi => new AfricarxivUbuntunetPreprintId({ value: doi }))

export const africarxivZenodoPreprintId = (): fc.Arbitrary<AfricarxivZenodoPreprintId> =>
  doi(constant('5281')).map(doi => new AfricarxivZenodoPreprintId({ value: doi }))

export const arcadiaSciencePreprintId = (): fc.Arbitrary<ArcadiaSciencePreprintId> =>
  doi(constant('57844')).map(doi => new ArcadiaSciencePreprintId({ value: doi }))

export const arxivPreprintId = (): fc.Arbitrary<ArxivPreprintId> =>
  doi(constant('48550')).map(doi => new ArxivPreprintId({ value: doi }))

export const arxivPreprintUrl = (): fc.Arbitrary<[URL, ArxivPreprintId]> =>
  fc
    .string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), minLength: 1 })
    .filter(suffix => isDoi(`10.48550/${suffix}`))
    .map(suffix => [
      new URL(`https://arxiv.org/abs/${suffix}`),
      new ArxivPreprintId({ value: Doi(`10.48550/arXiv.${suffix}`) }),
    ])

export const authoreaPreprintId = (): fc.Arbitrary<AuthoreaPreprintId> =>
  doi(constant('22541')).map(doi => new AuthoreaPreprintId({ value: doi }))

export const authoreaPreprintUrl = (): fc.Arbitrary<[URL, AuthoreaPreprintId]> =>
  authoreaPreprintId().map(id => [new URL(`https://www.authorea.com/doi/full/${encodeURIComponent(id.value)}`), id])

export const biorxivPreprintId = (): fc.Arbitrary<BiorxivPreprintId> =>
  doi(constant('1101')).map(doi => new BiorxivPreprintId({ value: doi }))

export const biorxivPreprintUrl = (): fc.Arbitrary<[URL, BiorxivPreprintId]> =>
  fc
    .string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), minLength: 1 })
    .filter(suffix => isDoi(`10.1101/${suffix}`))
    .map(suffix => [
      new URL(`https://www.biorxiv.org/content/10.1101/${suffix}`),
      new BiorxivPreprintId({ value: Doi(`10.1101/${suffix}`) }),
    ])

export const chemrxivPreprintId = (): fc.Arbitrary<ChemrxivPreprintId> =>
  doi(constant('26434')).map(doi => new ChemrxivPreprintId({ value: doi }))

export const chemrxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => new URL(`https://chemrxiv.org/engage/chemrxiv/article-details/${id}`))

export const curvenotePreprintId = (): fc.Arbitrary<CurvenotePreprintId> =>
  doi(constant('62329')).map(doi => new CurvenotePreprintId({ value: doi }))

export const eartharxivPreprintId = (): fc.Arbitrary<EartharxivPreprintId> =>
  doi(constant('31223')).map(doi => new EartharxivPreprintId({ value: doi }))

export const eartharxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.integer({ min: 1 }).map(id => new URL(`https://eartharxiv.org/repository/view/${id}/`))

export const ecoevorxivPreprintId = (): fc.Arbitrary<EcoevorxivPreprintId> =>
  doi(constant('32942')).map(doi => new EcoevorxivPreprintId({ value: doi }))

export const ecoevorxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.integer({ min: 1 }).map(id => new URL(`https://ecoevorxiv.org/repository/view/${id}/`))

export const edarxivPreprintId = (): fc.Arbitrary<EdarxivPreprintId> =>
  doi(constant('35542')).map(doi => new EdarxivPreprintId({ value: doi }))

export const edarxivPreprintUrl = (): fc.Arbitrary<[URL, EdarxivPreprintId]> =>
  fc
    .tuple(
      fc.string({ unit: alphanumeric(), minLength: 1 }),
      fc.constantFrom('https://edarxiv.org', 'https://osf.io/preprints/edarxiv'),
    )
    .map(([id, baseUrl]) => [
      new URL(`${baseUrl}/${id}`),
      new EdarxivPreprintId({ value: Doi(`10.35542/osf.io/${id}`) }),
    ])

export const engrxivPreprintId = (): fc.Arbitrary<EngrxivPreprintId> =>
  doi(constant('31224')).map(doi => new EngrxivPreprintId({ value: doi }))

export const engrxivPreprintUrl = (): fc.Arbitrary<[URL, EngrxivPreprintId]> =>
  fc
    .integer({ min: 1 })
    .map(id => [
      new URL(`https://engrxiv.org/preprint/view/${id}`),
      new EngrxivPreprintId({ value: Doi(`10.31224/${id}`) }),
    ])

export const jxivPreprintId = (): fc.Arbitrary<JxivPreprintId> =>
  doi(constant('51094')).map(doi => new JxivPreprintId({ value: doi }))

export const jxivPreprintUrl = (): fc.Arbitrary<[URL, JxivPreprintId]> =>
  fc
    .integer({ min: 1 })
    .map(id => [
      new URL(`https://jxiv.jst.go.jp/index.php/jxiv/preprint/view/${id}`),
      new JxivPreprintId({ value: Doi(`10.51094/jxiv.${id}`) }),
    ])

export const lifecycleJournalPreprintId = (): fc.Arbitrary<LifecycleJournalPreprintId> =>
  doi(constant('17605')).map(doi => new LifecycleJournalPreprintId({ value: doi }))

export const lifecycleJournalPreprintUrl = (): fc.Arbitrary<
  [URL, [OsfOrLifecycleJournalPreprintId, OsfPreprintsPreprintId]]
> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/${id}`),
      [
        new OsfOrLifecycleJournalPreprintId({ value: Doi(`10.17605/osf.io/${id}`) }),
        new OsfPreprintsPreprintId({ value: Doi(`10.31219/osf.io/${id}`) }),
      ],
    ])

export const medrxivPreprintId = (): fc.Arbitrary<MedrxivPreprintId> =>
  doi(constant('1101')).map(doi => new MedrxivPreprintId({ value: doi }))

export const medrxivPreprintUrl = (): fc.Arbitrary<[URL, MedrxivPreprintId]> =>
  fc
    .string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), minLength: 1 })
    .filter(suffix => isDoi(`10.1101/${suffix}`))
    .map(suffix => [
      new URL(`https://www.medrxiv.org/content/10.1101/${suffix}`),
      new MedrxivPreprintId({ value: Doi(`10.1101/${suffix}`) }),
    ])

export const metaarxivPreprintId = (): fc.Arbitrary<MetaarxivPreprintId> =>
  doi(constant('31222')).map(doi => new MetaarxivPreprintId({ value: doi }))

export const metaarxivPreprintUrl = (): fc.Arbitrary<[URL, MetaarxivPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/metaarxiv/${id}`),
      new MetaarxivPreprintId({ value: Doi(`10.31222/osf.io/${id}`) }),
    ])

export const neurolibrePreprintId = (): fc.Arbitrary<NeurolibrePreprintId> =>
  doi(constant('55458')).map(doi => new NeurolibrePreprintId({ value: doi }))

export const neurolibrePreprintUrl = (): fc.Arbitrary<[URL, NeurolibrePreprintId]> =>
  fc
    .string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), minLength: 1 })
    .map(id => [
      new URL(`https://neurolibre.org/papers/10.55458/neurolibre.${id}`),
      new NeurolibrePreprintId({ value: Doi(`10.55458/neurolibre.${id}`) }),
    ])

export const osfPreprintId = (): fc.Arbitrary<OsfPreprintId> =>
  doi(constant('17605')).map(doi => new OsfPreprintId({ value: doi }))

export const osfPreprintUrl = (): fc.Arbitrary<[URL, [OsfOrLifecycleJournalPreprintId, OsfPreprintsPreprintId]]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/${id}`),
      [
        new OsfOrLifecycleJournalPreprintId({ value: Doi(`10.17605/osf.io/${id}`) }),
        new OsfPreprintsPreprintId({ value: Doi(`10.31219/osf.io/${id}`) }),
      ],
    ])

export const osfPreprintsPreprintId = (): fc.Arbitrary<OsfPreprintsPreprintId> =>
  doi(constant('31219')).map(doi => new OsfPreprintsPreprintId({ value: doi }))

export const osfPreprintsPreprintUrl = (): fc.Arbitrary<
  [URL, [OsfOrLifecycleJournalPreprintId, OsfPreprintsPreprintId] | [OsfPreprintsPreprintId]]
> =>
  fc.oneof(
    fc
      .string({ unit: alphanumeric(), minLength: 1 })
      .map(id =>
        Tuple.make(
          new URL(`https://osf.io/${id}`),
          Tuple.make(
            new OsfOrLifecycleJournalPreprintId({ value: Doi(`10.17605/osf.io/${id}`) }),
            new OsfPreprintsPreprintId({ value: Doi(`10.31219/osf.io/${id}`) }),
          ),
        ),
      ),
    fc
      .string({ unit: alphanumeric(), minLength: 1 })
      .map(id =>
        Tuple.make(
          new URL(`https://osf.io/preprints/${id}`),
          Tuple.make(new OsfPreprintsPreprintId({ value: Doi(`10.31219/osf.io/${id}`) })),
        ),
      ),
  )

export const philsciPreprintId = (): fc.Arbitrary<PhilsciPreprintId> =>
  fc.integer({ min: 1 }).map(id => new PhilsciPreprintId({ value: id }))

export const philsciPreprintUrl = (): fc.Arbitrary<[URL, PhilsciPreprintId]> =>
  philsciPreprintId().map(id => [new URL(`https://philsci-archive.pitt.edu/${id.value}/`), id])

export const preprintsorgPreprintId = (): fc.Arbitrary<PreprintsorgPreprintId> =>
  doi(constant('20944')).map(doi => new PreprintsorgPreprintId({ value: doi }))

export const preprintsorgPreprintUrl = (): fc.Arbitrary<[URL, PreprintsorgPreprintId]> =>
  fc
    .tuple(
      fc.string({ unit: fc.oneof(alphanumeric(), constant('.')), minLength: 1 }).filter(id => !/^\.{1,2}$/.test(id)),
      fc.integer({ min: 1 }),
    )
    .map(([id, version]) => [
      new URL(`https://www.preprints.org/manuscript/${id}/v${version}`),
      new PreprintsorgPreprintId({ value: Doi(`10.20944/preprints${id}.v${version}`) }),
    ])

export const psyarxivPreprintId = (): fc.Arbitrary<PsyarxivPreprintId> =>
  doi(constant('31234')).map(doi => new PsyarxivPreprintId({ value: doi }))

export const psyarxivPreprintUrl = (): fc.Arbitrary<[URL, PsyarxivPreprintId]> =>
  fc
    .tuple(
      fc.string({ unit: alphanumeric(), minLength: 1 }),
      fc.constantFrom('https://psyarxiv.com', 'https://osf.io/preprints/psyarxiv'),
    )
    .map(([id, baseUrl]) => [
      new URL(`${baseUrl}/${id}`),
      new PsyarxivPreprintId({ value: Doi(`10.31234/osf.io/${id}`) }),
    ])

export const psychArchivesPreprintId = (): fc.Arbitrary<PsychArchivesPreprintId> =>
  doi(constant('23668')).map(doi => new PsychArchivesPreprintId({ value: doi }))

export const researchSquarePreprintId = (): fc.Arbitrary<ResearchSquarePreprintId> =>
  doi(constant('21203')).map(doi => new ResearchSquarePreprintId({ value: doi }))

export const researchSquarePreprintUrl = (): fc.Arbitrary<[URL, ResearchSquarePreprintId]> =>
  fc
    .tuple(fc.integer({ min: 1 }), fc.integer({ min: 1 }))
    .map(([id, version]) => [
      new URL(`https://www.researchsquare.com/article/rs-${id}/v${version}`),
      new ResearchSquarePreprintId({ value: Doi(`10.21203/rs.3.rs-${id}/v${version}`) }),
    ])

export const scieloPreprintId = (): fc.Arbitrary<ScieloPreprintId> =>
  doi(constant('1590')).map(doi => new ScieloPreprintId({ value: doi }))

export const scieloPreprintUrl = (): fc.Arbitrary<[URL, ScieloPreprintId]> =>
  fc
    .integer({ min: 1 })
    .map(id => [
      new URL(`https://preprints.scielo.org/index.php/scielo/preprint/view/${id}`),
      new ScieloPreprintId({ value: Doi(`10.1590/SciELOPreprints.${id}`) }),
    ])

export const scienceOpenPreprintId = (): fc.Arbitrary<ScienceOpenPreprintId> =>
  doi(constant('14293')).map(doi => new ScienceOpenPreprintId({ value: doi }))

export const scienceOpenPreprintUrl = (): fc.Arbitrary<[URL, ScienceOpenPreprintId]> =>
  scienceOpenPreprintId().map(({ value }) => [
    new URL(`https://www.scienceopen.com/hosted-document?doi=${encodeURIComponent(value)}`),
    new ScienceOpenPreprintId({ value }),
  ])

export const socarxivPreprintId = (): fc.Arbitrary<SocarxivPreprintId> =>
  doi(constant('31235')).map(doi => new SocarxivPreprintId({ value: doi }))

export const socarxivPreprintUrl = (): fc.Arbitrary<[URL, SocarxivPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/socarxiv/${id}`),
      new SocarxivPreprintId({ value: Doi(`10.31235/osf.io/${id}`) }),
    ])

export const ssrnPreprintId = (): fc.Arbitrary<SsrnPreprintId> =>
  doi(constant('2139')).map(doi => new SsrnPreprintId({ value: doi }))

export const ssrnPreprintUrl = (): fc.Arbitrary<[URL, SsrnPreprintId]> =>
  fc
    .integer({ min: 1 })
    .map(id => [new URL(`https://ssrn.com/abstract=${id}`), new SsrnPreprintId({ value: Doi(`10.2139/ssrn.${id}`) })])

export const verixivPreprintId = (): fc.Arbitrary<VerixivPreprintId> =>
  doi(constant('12688')).map(doi => new VerixivPreprintId({ value: doi }))

export const techrxivPreprintId = (): fc.Arbitrary<TechrxivPreprintId> =>
  doi(constant('36227')).map(doi => new TechrxivPreprintId({ value: doi }))

export const techrxivPreprintUrl = (): fc.Arbitrary<[URL, TechrxivPreprintId]> =>
  techrxivPreprintId().map(id => [new URL(`https://www.techrxiv.org/doi/full/${encodeURIComponent(id.value)}`), id])

export const zenodoPreprintId = (): fc.Arbitrary<ZenodoPreprintId> =>
  doi(constant('5281')).map(doi => new ZenodoPreprintId({ value: doi }))

export const zenodoPreprintUrl = (): fc.Arbitrary<[URL, ZenodoPreprintId]> =>
  fc
    .integer({ min: 1 })
    .map(id => [
      new URL(`https://zenodo.org/record/${id}`),
      new ZenodoPreprintId({ value: Doi(`10.5281/zenodo.${id}`) }),
    ])

export const biorxivOrMedrxivPreprintId = (): fc.Arbitrary<BiorxivOrMedrxivPreprintId> =>
  doi(constant('1101')).map(doi => new BiorxivOrMedrxivPreprintId({ value: doi }))

export const osfOrLifecycleJournalPreprintId = (): fc.Arbitrary<OsfOrLifecycleJournalPreprintId> =>
  doi(constant('17605')).map(doi => new OsfOrLifecycleJournalPreprintId({ value: doi }))

export const zenodoOrAfricarxivPreprintId = (): fc.Arbitrary<ZenodoOrAfricarxivPreprintId> =>
  doi(constant('5281')).map(doi => new ZenodoOrAfricarxivPreprintId({ value: doi }))

export const preprintId = (): fc.Arbitrary<PreprintId> => fc.oneof(philsciPreprintId(), preprintIdWithDoi())

export const preprintIdWithDoi = (): fc.Arbitrary<PreprintIdWithDoi> =>
  fc.oneof(
    advancePreprintId(),
    africarxivPreprintId(),
    arcadiaSciencePreprintId(),
    arxivPreprintId(),
    authoreaPreprintId(),
    biorxivPreprintId(),
    chemrxivPreprintId(),
    curvenotePreprintId(),
    eartharxivPreprintId(),
    ecoevorxivPreprintId(),
    edarxivPreprintId(),
    engrxivPreprintId(),
    jxivPreprintId(),
    lifecycleJournalPreprintId(),
    medrxivPreprintId(),
    metaarxivPreprintId(),
    neurolibrePreprintId(),
    osfPreprintId(),
    osfPreprintsPreprintId(),
    preprintsorgPreprintId(),
    psyarxivPreprintId(),
    psychArchivesPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    scienceOpenPreprintId(),
    socarxivPreprintId(),
    ssrnPreprintId(),
    techrxivPreprintId(),
    verixivPreprintId(),
    zenodoPreprintId(),
  )

export const indeterminatePreprintId = (): fc.Arbitrary<IndeterminatePreprintId> =>
  fc.oneof(philsciPreprintId(), indeterminatePreprintIdWithDoi())

export const indeterminatePreprintIdWithDoi = (): fc.Arbitrary<IndeterminatePreprintIdWithDoi> =>
  fc.oneof(
    preprintIdWithDoi(),
    biorxivOrMedrxivPreprintId(),
    osfOrLifecycleJournalPreprintId(),
    zenodoOrAfricarxivPreprintId(),
  )

export const crossrefPreprintId = (): fc.Arbitrary<CrossrefPreprintId | LegacyCrossrefPreprintId> =>
  fc.oneof(
    biorxivPreprintId(),
    medrxivPreprintId(),
    metaarxivPreprintId(),
    neurolibrePreprintId(),
    osfPreprintsPreprintId(),
    preprintsorgPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    socarxivPreprintId(),
    ssrnPreprintId(),
    verixivPreprintId(),
    legacyCrossrefPreprintId(),
  )

export const legacyCrossrefPreprintId = (): fc.Arbitrary<LegacyCrossrefPreprintId> =>
  fc.oneof(
    advancePreprintId(),
    africarxivOsfPreprintId(),
    authoreaPreprintId(),
    chemrxivPreprintId(),
    curvenotePreprintId(),
    eartharxivPreprintId(),
    ecoevorxivPreprintId(),
    edarxivPreprintId(),
    engrxivPreprintId(),
    psyarxivPreprintId(),
    scienceOpenPreprintId(),
    techrxivPreprintId(),
  )

export const datacitePreprintId = (): fc.Arbitrary<DatacitePreprintId | LegacyDatacitePreprintId> =>
  fc.oneof(
    africarxivZenodoPreprintId(),
    arxivPreprintId(),
    lifecycleJournalPreprintId(),
    osfPreprintId(),
    zenodoPreprintId(),
    legacyDatacitePreprintId(),
  )

export const legacyDatacitePreprintId = (): fc.Arbitrary<LegacyDatacitePreprintId> =>
  fc.oneof(
    africarxivFigsharePreprintId(),
    africarxivUbuntunetPreprintId(),
    arcadiaSciencePreprintId(),
    psychArchivesPreprintId(),
  )

export const japanLinkCenterPreprintId = (): fc.Arbitrary<JapanLinkCenterPreprintId> => jxivPreprintId()

export const orcid = (): fc.Arbitrary<Orcid> =>
  fc
    .string({
      unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
      minLength: 4 + 4 + 4 + 3,
      maxLength: 4 + 4 + 4 + 3,
    })
    .map(value => mod11_2.generate(value).replace(/.{4}(?=.)/g, '$&-'))
    .filter(isOrcid)

export const reviewRequestPreprintId = (): fc.Arbitrary<ReviewRequestPreprintId> =>
  fc.oneof(
    advancePreprintId(),
    africarxivUbuntunetPreprintId(),
    arxivPreprintId(),
    biorxivPreprintId(),
    chemrxivPreprintId(),
    eartharxivPreprintId(),
    ecoevorxivPreprintId(),
    edarxivPreprintId(),
    engrxivPreprintId(),
    lifecycleJournalPreprintId(),
    medrxivPreprintId(),
    metaarxivPreprintId(),
    neurolibrePreprintId(),
    osfPreprintId(),
    osfPreprintsPreprintId(),
    preprintsorgPreprintId(),
    psyarxivPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    socarxivPreprintId(),
    techrxivPreprintId(),
    zenodoPreprintId(),
  )

export const notAReviewRequestPreprintId = (): fc.Arbitrary<Exclude<PreprintId, ReviewRequestPreprintId>> =>
  fc.oneof(
    africarxivFigsharePreprintId(),
    africarxivOsfPreprintId(),
    africarxivZenodoPreprintId(),
    arcadiaSciencePreprintId(),
    authoreaPreprintId(),
    curvenotePreprintId(),
    jxivPreprintId(),
    philsciPreprintId(),
    psychArchivesPreprintId(),
    scienceOpenPreprintId(),
    ssrnPreprintId(),
    verixivPreprintId(),
  )

export const datasetId = (): fc.Arbitrary<Datasets.DatasetId> => fc.oneof(dryadDatasetId())

export const dryadDatasetId = (): fc.Arbitrary<Datasets.DryadDatasetId> =>
  doi(constant('5061')).map(doi => new Datasets.DryadDatasetId({ value: doi }))

export const fieldId = (): fc.Arbitrary<FieldId> => fc.constantFrom(...fieldIds)

export const subfieldId = (): fc.Arbitrary<SubfieldId> => fc.constantFrom(...subfieldIds)

export const reviewRequest = (): fc.Arbitrary<ReviewRequest> =>
  fc.oneof(incompleteReviewRequest(), completedReviewRequest())

export const incompleteReviewRequest = ({
  persona,
}: { persona?: fc.Arbitrary<IncompleteReviewRequest['persona']> } = {}): fc.Arbitrary<IncompleteReviewRequest> =>
  fc.record(
    {
      status: constant('incomplete'),
      persona: persona ?? constantFrom('public', 'pseudonym'),
    },
    !persona ? { requiredKeys: ['status'] } : {},
  )

export const completedReviewRequest = (): fc.Arbitrary<CompletedReviewRequest> =>
  fc.record({ status: constant('completed') })

export const authorInvite = (): fc.Arbitrary<AuthorInvite> =>
  fc.oneof(openAuthorInvite(), declinedAuthorInvite(), assignedAuthorInvite(), completedAuthorInvite())

export const openAuthorInvite = (): fc.Arbitrary<OpenAuthorInvite> =>
  fc.record({ status: constant('open'), emailAddress: emailAddress(), review: fc.integer({ min: 1 }) })

export const declinedAuthorInvite = (): fc.Arbitrary<DeclinedAuthorInvite> =>
  fc.record({ status: constant('declined'), review: fc.integer({ min: 1 }) })

export const assignedAuthorInvite = ({
  orcid: _orcid,
  persona,
}: {
  orcid?: fc.Arbitrary<Orcid>
  persona?: fc.Arbitrary<AssignedAuthorInvite['persona']>
} = {}): fc.Arbitrary<AssignedAuthorInvite> =>
  fc.record(
    {
      status: constant('assigned'),
      emailAddress: emailAddress(),
      orcid: _orcid ?? orcid(),
      persona: persona ?? constantFrom('public', 'pseudonym'),
      review: fc.integer({ min: 1 }),
    },
    !persona ? { requiredKeys: ['status', 'emailAddress', 'orcid', 'review'] } : {},
  )

export const completedAuthorInvite = ({
  orcid: _orcid,
}: { orcid?: fc.Arbitrary<Orcid> } = {}): fc.Arbitrary<CompletedAuthorInvite> =>
  fc.record({ status: constant('completed'), orcid: _orcid ?? orcid(), review: fc.integer({ min: 1 }) })

export const careerStage = (): fc.Arbitrary<CareerStage> =>
  fc.record({ value: careerStageValue(), visibility: careerStageVisibility() })

export const careerStageValue = (): fc.Arbitrary<CareerStage['value']> => constantFrom('early', 'mid', 'late')

export const careerStageVisibility = (): fc.Arbitrary<CareerStage['visibility']> => constantFrom('public', 'restricted')

export const languages = (): fc.Arbitrary<Languages> =>
  fc.record({ value: nonEmptyString(), visibility: languagesVisibility() })

export const languagesVisibility = (): fc.Arbitrary<Languages['visibility']> => constantFrom('public', 'restricted')

export const location = (): fc.Arbitrary<Location> =>
  fc.record({ value: nonEmptyString(), visibility: locationVisibility() })

export const locationVisibility = (): fc.Arbitrary<Location['visibility']> => constantFrom('public', 'restricted')

export const researchInterests = (): fc.Arbitrary<ResearchInterests> =>
  fc.record({ value: nonEmptyString(), visibility: researchInterestsVisibility() })

export const researchInterestsVisibility = (): fc.Arbitrary<ResearchInterests['visibility']> =>
  constantFrom('public', 'restricted')

export const isOpenForRequests = (): fc.Arbitrary<IsOpenForRequests> =>
  fc.oneof(constant({ value: false }), fc.record({ value: constant(true), visibility: isOpenForRequestsVisibility() }))

export const isOpenForRequestsVisibility = (): fc.Arbitrary<
  Extract<IsOpenForRequests, { value: true }>['visibility']
> => constantFrom('public', 'restricted')

export const slackUser = (): fc.Arbitrary<SlackUser> => fc.record({ name: fc.string(), image: url(), profile: url() })

export const slackUserId = (): fc.Arbitrary<SlackUserId> =>
  fc.record({ userId: nonEmptyString(), accessToken: nonEmptyString(), scopes: hashSet(nonEmptyString()) })

export const orcidToken = (): fc.Arbitrary<OrcidToken> =>
  fc.record({
    accessToken: nonEmptyString(),
    scopes: hashSet(nonEmptyString()),
  })

export const clubId = (): fc.Arbitrary<ClubId> => constantFrom(...clubIds)

export const pseudonym = (): fc.Arbitrary<Pseudonym> =>
  fc.tuple(constantFrom(...colors), constantFrom(...animals)).map(parts => Pseudonym(capitalCase(parts.join(' '))))

export const profileId = (): fc.Arbitrary<ProfileId.ProfileId> => fc.oneof(orcidProfileId(), pseudonymProfileId())

export const orcidProfileId = (): fc.Arbitrary<ProfileId.OrcidProfileId> => orcid().map(ProfileId.forOrcid)

export const pseudonymProfileId = (): fc.Arbitrary<ProfileId.PseudonymProfileId> =>
  pseudonym().map(ProfileId.forPseudonym)

export const dateTimeUtc = (): fc.Arbitrary<DateTime.Utc> => fc.date().map(DateTime.unsafeFromDate)

export const year = (): fc.Arbitrary<number> => fc.integer({ min: -271820, max: 275759 })

export const plainYearMonth = (): fc.Arbitrary<Temporal.PlainYearMonth> =>
  fc
    .record({
      year: year(),
      month: fc.integer({ min: 1, max: 12 }),
    })
    .map(args => Temporal.PlainYearMonth.from(args))

export const plainDate = (): fc.Arbitrary<Temporal.PlainDate> =>
  fc
    .record({
      year: year(),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 31 }),
    })
    .map(args => Temporal.PlainDate.from(args))

export const instant = (): fc.Arbitrary<Temporal.Instant> =>
  fc.date().map(date => Temporal.Instant.from(date.toISOString()))

export const origin = (): fc.Arbitrary<URL> => url().map(url => new URL(url.origin))

export const url = (): fc.Arbitrary<URL> => fc.webUrl({ withQueryParameters: true }).map(url => new URL(url))

export const requestMethod = (): fc.Arbitrary<HttpMethod.HttpMethod> =>
  constantFrom('DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT')

const headerName = () =>
  fc.string({
    unit: fc.string({ minLength: 1, maxLength: 1 }).filter(char => /^[\^_`a-zA-Z\-0-9!#$%&'*+.|~]$/.test(char)),
    minLength: 1,
  })

export const headers = (include: fc.Arbitrary<Record<string, string>> = constant({})) =>
  fc
    .tuple(
      fc.option(fc.dictionary(headerName(), fc.lorem()), { nil: undefined }).map(init =>
        Object.defineProperties(new Headers(init), {
          [fc.toStringMethod]: { value: () => fc.stringify(init) },
        }),
      ),
      include,
    )
    .map(([headers, include]) => {
      Object.entries(include).forEach(([key, value]) => {
        headers.set(key, value)
      })
      return headers
    })

export const statusCode = (): fc.Arbitrary<Status> =>
  constantFrom(...Object.values(Status).filter(status => status >= 200))

export const cacheableStatusCode = (): fc.Arbitrary<CacheableStatusCodes> => statusCode().filter(isCacheable)

export const nonCacheableStatusCode = (): fc.Arbitrary<NonCacheableStatusCodes> => statusCode().filter(isNonCacheable)

export const fetchRequest = ({
  headers: headers_,
  method: method_,
  url: url_,
}: {
  headers?: fc.Arbitrary<Headers>
  method?: fc.Arbitrary<string>
  url?: fc.Arbitrary<URL>
} = {}): fc.Arbitrary<Request> =>
  fc
    .record({
      headers: headers_ ?? headers(),
      method: method_ ?? requestMethod(),
      url: url_ ?? url(),
    })
    .map(args => {
      return Object.defineProperties(new Request(args.url, args), {
        [fc.toStringMethod]: { value: () => fc.stringify({ ...args, headers: { ...args.headers } }) },
      })
    })

export const fetchResponse = ({
  headers: headers_,
  status,
  json,
  text,
}: {
  headers?: fc.Arbitrary<Headers>
  status?: fc.Arbitrary<Status>
  json?: fc.Arbitrary<Json>
  text?: fc.Arbitrary<string>
} = {}): fc.Arbitrary<Response> =>
  fc
    .record({
      headers: headers_ ?? headers(),
      status:
        status ??
        statusCode().filter(status =>
          (json ?? text)
            ? ![Status.NoContent, Status.ResetContent].includes(status as never) && (status < 300 || status >= 400)
            : true,
        ),
      text: json ? json.map(JSON.stringify) : (text ?? fc.string()),
    })
    .map(args => {
      return Object.defineProperties(
        new Response(
          ![Status.NoContent, Status.ResetContent].includes(args.status as never) &&
          (args.status < 300 || args.status >= 400)
            ? args.text
            : undefined,
          {
            headers: args.headers,
            status: args.status,
          },
        ),
        {
          [fc.toStringMethod]: { value: () => fc.stringify({ ...args, headers: { ...args.headers } }) },
        },
      )
    })

export const request = ({
  body,
  headers,
  method,
  path,
}: {
  body?: fc.Arbitrary<Body>
  headers?: fc.Arbitrary<RequestHeaders>
  method?: fc.Arbitrary<RequestMethod>
  path?: fc.Arbitrary<string>
} = {}): fc.Arbitrary<ExpressRequest> =>
  fc
    .record({
      body: body ?? constant(undefined),
      headers: headers ?? constant({}),
      method: method ?? requestMethod(),
      url: path
        ? fc.tuple(path, url()).map(([path, base]) => new URL(path, base).href)
        : fc.webUrl({ withQueryParameters: true }),
    })
    .map(args =>
      Object.defineProperties(createRequest(args), { [fc.toStringMethod]: { value: () => fc.stringify(args) } }),
    )

export const response = (): fc.Arbitrary<ExpressResponse> =>
  fc
    .record({ req: request() })
    .map(args =>
      Object.defineProperties(createResponse(args), { [fc.toStringMethod]: { value: () => fc.stringify(args) } }),
    )

export const connection = <S = H.StatusOpen>(...args: Parameters<typeof request>): fc.Arbitrary<ExpressConnection<S>> =>
  fc.tuple(request(...args), response()).map(args =>
    Object.defineProperties(new ExpressConnection(...args), {
      [fc.toStringMethod]: { value: () => fc.stringify(args[0]) },
    }),
  )

export const nonEmptyArray = <T>(
  arb: fc.Arbitrary<T>,
  constraints: fc.ArrayConstraints = {},
): fc.Arbitrary<Array.NonEmptyArray<T>> => fc.array(arb, { minLength: 1, ...constraints }).filter(Array.isNonEmptyArray)

export const nonEmptyString = (): fc.Arbitrary<NonEmptyString> => fc.string({ minLength: 1 }).filter(isNonEmptyString)

export const nonEmptyStringOf = (charArb: fc.Arbitrary<string>): fc.Arbitrary<NonEmptyString> =>
  fc.string({ unit: charArb, minLength: 1 }).filter(isNonEmptyString)

export const languageCode = (): fc.Arbitrary<LanguageCode> => constantFrom(...ISO6391.getAllCodes())

export const orcidLocale = (): fc.Arbitrary<OrcidLocale.OrcidLocale> => constantFrom(...OrcidLocale.OrcidLocales)

export const user = ({ orcid: userOrcid }: { orcid?: fc.Arbitrary<User['orcid']> } = {}): fc.Arbitrary<User> =>
  fc.record({
    name: fc.string(),
    orcid: userOrcid ?? orcid(),
    pseudonym: pseudonym(),
  })

export const userOnboarding = ({
  seenMyDetailsPage,
}: {
  seenMyDetailsPage?: fc.Arbitrary<UserOnboarding['seenMyDetailsPage']>
} = {}): fc.Arbitrary<UserOnboarding> =>
  fc.record({
    seenMyDetailsPage: seenMyDetailsPage ?? fc.boolean(),
  })

export const email = (): fc.Arbitrary<Email> =>
  fc.record({
    from: fc.record({ name: fc.string(), address: emailAddress() }),
    to: fc.record({ name: fc.string(), address: emailAddress() }),
    subject: fc.string(),
    text: fc.string(),
    html: html(),
  })

export const preprint = ({ authors }: { authors?: Arbitrary<Preprint['authors']> } = {}): fc.Arbitrary<Preprint> =>
  fc.record(
    {
      abstract: fc.record({
        language: languageCode(),
        text: html(),
      }),
      authors:
        authors ??
        nonEmptyArray(
          fc.record(
            {
              name: fc.string(),
              orcid: orcid(),
            },
            { requiredKeys: ['name'] },
          ),
        ),
      id: preprintId(),
      posted: plainDate(),
      title: fc.record({
        language: languageCode(),
        text: html(),
      }),
      url: url(),
    },
    { requiredKeys: ['authors', 'id', 'posted', 'title', 'url'] },
  )

export const preprintTitle = ({ id }: { id?: fc.Arbitrary<PreprintId> } = {}): fc.Arbitrary<PreprintTitle> =>
  fc.record({
    id: id ?? preprintId(),
    language: languageCode(),
    title: html(),
  })

export const prereview = (): fc.Arbitrary<Prereview> =>
  fc
    .record({
      authors: fc.record({
        named: nonEmptyArray(fc.record({ name: fc.string(), orcid: orcid() }, { requiredKeys: ['name'] })),
        anonymous: fc.integer({ min: 0 }),
      }),
      doi: doi(),
      id: fc.integer(),
      language: fc.option(languageCode(), { nil: undefined }),
      license: constantFrom('CC-BY-4.0', 'CC0-1.0'),
      live: fc.boolean(),
      published: plainDate(),
      preprint: fc.record({
        id: preprintId(),
        language: languageCode(),
        title: html(),
        url: url(),
      }),
      requested: fc.boolean(),
      structured: fc.boolean(),
      text: html(),
    })
    .map(args => new Prereview(args))

export const commentWasStarted = (): fc.Arbitrary<Comments.CommentWasStarted> =>
  fc
    .record({
      prereviewId: fc.integer(),
      authorId: orcid(),
    })
    .map(data => new Comments.CommentWasStarted(data))

export const commentWasEntered = (): fc.Arbitrary<Comments.CommentWasEntered> =>
  fc
    .record({
      comment: html(),
    })
    .map(data => new Comments.CommentWasEntered(data))

export const personaWasChosen = (): fc.Arbitrary<Comments.PersonaWasChosen> =>
  fc
    .record({
      persona: constantFrom('public', 'pseudonym'),
    })
    .map(data => new Comments.PersonaWasChosen(data))

export const competingInterestsWereDeclared = (): fc.Arbitrary<Comments.CompetingInterestsWereDeclared> =>
  fc
    .record({
      competingInterests: maybe(nonEmptyString()),
    })
    .map(data => new Comments.CompetingInterestsWereDeclared(data))

export const existenceOfVerifiedEmailAddressWasConfirmed =
  (): fc.Arbitrary<Comments.ExistenceOfVerifiedEmailAddressWasConfirmed> =>
    fc.constant(new Comments.ExistenceOfVerifiedEmailAddressWasConfirmed())

export const commentPublicationWasRequested = (): fc.Arbitrary<Comments.CommentPublicationWasRequested> =>
  fc.constant(new Comments.CommentPublicationWasRequested())

export const doiWasAssigned = (): fc.Arbitrary<Comments.DoiWasAssigned> =>
  fc
    .record({
      id: fc.integer(),
      doi: doi(),
    })
    .map(data => new Comments.DoiWasAssigned(data))

export const commentWasPublished = (): fc.Arbitrary<Comments.CommentWasPublished> =>
  fc.constant(new Comments.CommentWasPublished())

export const commentEvent = (): fc.Arbitrary<Comments.CommentEvent> =>
  fc.oneof(
    commentWasStarted(),
    commentWasEntered(),
    personaWasChosen(),
    competingInterestsWereDeclared(),
    existenceOfVerifiedEmailAddressWasConfirmed(),
    commentPublicationWasRequested(),
    doiWasAssigned(),
    commentWasPublished(),
  )

export const datasetReviewWasStarted = (): fc.Arbitrary<DatasetReviews.DatasetReviewWasStarted> =>
  fc
    .record({
      authorId: orcid(),
      datasetId: datasetId(),
    })
    .map(data => new DatasetReviews.DatasetReviewWasStarted(data))

export const datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples =
  (): fc.Arbitrary<DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples> =>
    fc
      .record({
        answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      })
      .map(data => new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples(data))

export const datasetReviewPublicationWasRequested = (): fc.Arbitrary<DatasetReviews.PublicationWasRequested> =>
  fc.constant(new DatasetReviews.PublicationWasRequested())

export const datasetReviewDoiWasAssigned = (): fc.Arbitrary<DatasetReviews.DoiWasAssigned> =>
  fc
    .record({
      id: fc.integer(),
      doi: doi(),
    })
    .map(data => new DatasetReviews.DoiWasAssigned(data))

export const datasetReviewWasPublished = (): fc.Arbitrary<DatasetReviews.DatasetReviewWasPublished> =>
  fc.constant(new DatasetReviews.DatasetReviewWasPublished())

export const datasetReviewEvent = (): fc.Arbitrary<DatasetReviews.DatasetReviewEvent> =>
  fc.oneof(
    datasetReviewWasStarted(),
    datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples(),
    datasetReviewPublicationWasRequested(),
    datasetReviewDoiWasAssigned(),
    datasetReviewWasPublished(),
  )

export const commentWasAlreadyStarted = (): fc.Arbitrary<Comments.CommentWasAlreadyStarted> =>
  fc.constant(new Comments.CommentWasAlreadyStarted())

export const commentHasNotBeenStarted = (): fc.Arbitrary<Comments.CommentHasNotBeenStarted> =>
  fc.constant(new Comments.CommentHasNotBeenStarted())

export const commentIsIncomplete = (): fc.Arbitrary<Comments.CommentIsIncomplete> =>
  fc.constant(new Comments.CommentIsIncomplete())

export const commentIsBeingPublished = (): fc.Arbitrary<Comments.CommentIsBeingPublished> =>
  fc.constant(new Comments.CommentIsBeingPublished())

export const commentWasAlreadyPublished = (): fc.Arbitrary<Comments.CommentWasAlreadyPublished> =>
  fc.constant(new Comments.CommentWasAlreadyPublished())

export const commentError = (): fc.Arbitrary<Comments.CommentError> =>
  fc.oneof(
    commentWasAlreadyStarted(),
    commentHasNotBeenStarted(),
    commentIsIncomplete(),
    commentIsBeingPublished(),
    commentWasAlreadyPublished(),
  )

export const commentNotStarted = (): fc.Arbitrary<Comments.CommentNotStarted> =>
  constant(new Comments.CommentNotStarted())

export const commentInProgress = ({
  codeOfConductAgreed,
  competingInterests,
  comment,
  persona,
  verifiedEmailAddressExists,
}: {
  codeOfConductAgreed?: fc.Arbitrary<Comments.CommentInProgress['codeOfConductAgreed']>
  competingInterests?: fc.Arbitrary<Comments.CommentInProgress['competingInterests']>
  comment?: fc.Arbitrary<Comments.CommentInProgress['comment']>
  persona?: fc.Arbitrary<Comments.CommentInProgress['persona']>
  verifiedEmailAddressExists?: fc.Arbitrary<Comments.CommentInProgress['verifiedEmailAddressExists']>
} = {}): fc.Arbitrary<Comments.CommentInProgress> =>
  fc
    .record({
      authorId: orcid(),
      prereviewId: fc.integer(),
      comment: comment ?? fc.option(html(), { nil: undefined }),
      competingInterests: competingInterests ?? fc.option(maybe(nonEmptyString()), { nil: undefined }),
      codeOfConductAgreed: codeOfConductAgreed ?? constantFrom(true, undefined),
      persona: persona ?? fc.option(constantFrom('public', 'pseudonym'), { nil: undefined }),
      verifiedEmailAddressExists: verifiedEmailAddressExists ?? constantFrom(true, undefined),
    })
    .map(data => new Comments.CommentInProgress(data))

export const commentReadyForPublishing = (): fc.Arbitrary<Comments.CommentReadyForPublishing> =>
  fc
    .record({
      authorId: orcid(),
      competingInterests: maybe(nonEmptyString()),
      comment: html(),
      persona: constantFrom('public', 'pseudonym'),
      prereviewId: fc.integer(),
    })
    .map(data => new Comments.CommentReadyForPublishing(data))

export const commentBeingPublished = ({
  doi: _doi,
  id: _id,
}: {
  doi?: fc.Arbitrary<Comments.CommentBeingPublished['doi']>
  id?: fc.Arbitrary<Comments.CommentBeingPublished['id']>
} = {}): fc.Arbitrary<Comments.CommentBeingPublished> =>
  fc
    .record({
      authorId: orcid(),
      competingInterests: maybe(nonEmptyString()),
      doi: _doi ?? option(doi(), { nil: undefined }),
      comment: html(),
      id: _id ?? option(fc.integer(), { nil: undefined }),
      persona: constantFrom('public', 'pseudonym'),
      prereviewId: fc.integer(),
    })
    .map(data => new Comments.CommentBeingPublished(data))

export const commentPublished = (): fc.Arbitrary<Comments.CommentPublished> =>
  fc
    .record({
      authorId: orcid(),
      competingInterests: maybe(nonEmptyString()),
      doi: doi(),
      comment: html(),
      id: fc.integer(),
      persona: constantFrom('public', 'pseudonym'),
      prereviewId: fc.integer(),
    })
    .map(data => new Comments.CommentPublished(data))

export const commentState = (): fc.Arbitrary<Comments.CommentState> =>
  fc.oneof(
    commentNotStarted(),
    commentInProgress(),
    commentReadyForPublishing(),
    commentBeingPublished(),
    commentPublished(),
  )

export const expectedToStartAComment = (): fc.Arbitrary<Comments.ExpectedToStartAComment> =>
  fc.constant(new Comments.ExpectedToStartAComment())

export const expectedToEnterAComment = (): fc.Arbitrary<Comments.ExpectedToEnterAComment> =>
  fc.record({ commentId: uuid() }).map(data => new Comments.ExpectedToEnterAComment(data))

export const expectedToChooseAPersona = (): fc.Arbitrary<Comments.ExpectedToChooseAPersona> =>
  fc.record({ commentId: uuid() }).map(data => new Comments.ExpectedToChooseAPersona(data))

export const expectedToDeclareCompetingInterests = (): fc.Arbitrary<Comments.ExpectedToDeclareCompetingInterests> =>
  fc.record({ commentId: uuid() }).map(data => new Comments.ExpectedToDeclareCompetingInterests(data))

export const expectedToAgreeToCodeOfConduct = (): fc.Arbitrary<Comments.ExpectedToAgreeToCodeOfConduct> =>
  fc.record({ commentId: uuid() }).map(data => new Comments.ExpectedToAgreeToCodeOfConduct(data))

export const expectedToConfirmExistenceOfVerifiedEmailAddress =
  (): fc.Arbitrary<Comments.ExpectedToVerifyEmailAddress> =>
    fc.record({ commentId: uuid() }).map(data => new Comments.ExpectedToVerifyEmailAddress(data))

export const expectedToPublishComment = (): fc.Arbitrary<Comments.ExpectedToPublishComment> =>
  fc.record({ commentId: uuid() }).map(data => new Comments.ExpectedToPublishComment(data))

export const expectedCommandForUser = (): fc.Arbitrary<Comments.ExpectedCommandForUser> =>
  fc.oneof(
    expectedToStartAComment(),
    expectedToEnterAComment(),
    expectedToChooseAPersona(),
    expectedToDeclareCompetingInterests(),
    expectedToAgreeToCodeOfConduct(),
    expectedToConfirmExistenceOfVerifiedEmailAddress(),
    expectedToPublishComment(),
  )

export const inputForCommentZenodoRecord = (): fc.Arbitrary<Comments.InputForCommentZenodoRecord> =>
  fc.record({
    authorId: orcid(),
    competingInterests: maybe(nonEmptyString()),
    comment: html(),
    persona: constantFrom('public', 'pseudonym'),
    prereviewId: fc.integer(),
  })

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
