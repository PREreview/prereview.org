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
import { Array, DateTime, Duration, Either, HashSet, Option, Predicate, Redacted, Struct, Tuple } from 'effect'
import * as fc from 'fast-check'
import type { Json, JsonRecord } from 'fp-ts/lib/Json.js'
import fs from 'fs'
import ISO6391, { type LanguageCode } from 'iso-639-1'
import path from 'path'
import { Uuid } from 'uuid-ts'
import type {
  AssignedAuthorInvite,
  AuthorInvite,
  CompletedAuthorInvite,
  DeclinedAuthorInvite,
  OpenAuthorInvite,
} from '../src/author-invite.ts'
import type { CareerStage } from '../src/career-stage.ts'
import * as Clubs from '../src/Clubs/index.ts'
import * as Comments from '../src/Comments/index.ts'
import type { OrcidOAuthEnv } from '../src/connect-orcid/index.ts'
import {
  type ContactEmailAddress,
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../src/contact-email-address.ts'
import type * as DatasetReviews from '../src/DatasetReviews/index.ts'
import * as Datasets from '../src/Datasets/index.ts'
import type { Email } from '../src/email.ts'
import * as Events from '../src/Events.ts'
import type { GhostPage } from '../src/GhostPage/index.ts'
import { type Html, type PlainText, sanitizeHtml, html as toHtml, plainText as toPlainText } from '../src/html.ts'
import type { IsOpenForRequests } from '../src/is-open-for-requests.ts'
import type { Languages } from '../src/languages.ts'
import {
  type SupportedLocale,
  SupportedLocales,
  type UserSelectableLanguage,
  UserSelectableLanguages,
  type UserSelectableLocale,
  UserSelectableLocales,
} from '../src/locales/index.ts'
import type { Location } from '../src/location.ts'
import type { OAuthEnv } from '../src/log-in/index.ts'
import assets from '../src/manifest.json' with { type: 'json' }
import type { OrcidToken } from '../src/orcid-token.ts'
import * as Personas from '../src/Personas/index.ts'
import type { CrossrefPreprintId as LegacyCrossrefPreprintId } from '../src/Preprints/Crossref/legacy-crossref.ts'
import type { CrossrefPreprintId } from '../src/Preprints/Crossref/PreprintId.ts'
import type { DatacitePreprintId } from '../src/Preprints/Datacite/PreprintId.ts'
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
  type Preprint,
  type PreprintId,
  type PreprintIdWithDoi,
  type PreprintTitle,
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
} from '../src/Preprints/index.ts'
import type { JapanLinkCenterPreprintId } from '../src/Preprints/JapanLinkCenter/PreprintId.ts'
import { Prereview } from '../src/Prereviews/index.ts'
import type { ResearchInterests } from '../src/research-interests.ts'
import {
  type FlashMessageResponse,
  FlashMessageSchema,
  type LogInResponse,
  type PageResponse,
  type RedirectResponse,
  type StreamlinePageResponse,
  type TwoUpPageResponse,
} from '../src/Response/index.ts'
import type {
  CompletedReviewRequest,
  IncompleteReviewRequest,
  ReviewRequest,
  ReviewRequestPreprintId,
} from '../src/review-request.ts'
import type { SlackUserId } from '../src/slack-user-id.ts'
import type { SlackUser } from '../src/slack-user.ts'
import * as StatusCodes from '../src/StatusCodes.ts'
import { EmailAddress } from '../src/types/EmailAddress.ts'
import { type FieldId, fieldIds } from '../src/types/field.ts'
import { OrcidLocale, ProfileId } from '../src/types/index.ts'
import { type NonEmptyString, isNonEmptyString } from '../src/types/NonEmptyString.ts'
import { type OrcidId, isOrcidId } from '../src/types/OrcidId.ts'
import { Pseudonym } from '../src/types/Pseudonym.ts'
import { type SubfieldId, subfieldIds } from '../src/types/subfield.ts'
import type { UserOnboarding } from '../src/user-onboarding.ts'
import type { User } from '../src/user.ts'

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

export const redacted = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Redacted.Redacted<A>> => arb.map(Redacted.make)

export const some = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Option.Option<A>> => arb.map(Option.some)

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
        Object.fromEntries(Struct.entries(recordModel).filter(([key]) => key !== omit)),
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
    type: fc.constantFrom('preprint', 'dataset'),
  })

export const redirectResponse = (): fc.Arbitrary<RedirectResponse> =>
  fc.record({
    _tag: constant('RedirectResponse'),
    status: constantFrom(StatusCodes.SeeOther, StatusCodes.Found, StatusCodes.MovedPermanently),
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

export const fileInDirectory = (directory: string): fc.Arbitrary<NonSharedBuffer> =>
  constantFrom(...fs.readdirSync(directory))
    .map(sample => path.resolve(directory, sample))
    .map(file =>
      Object.defineProperties(fs.readFileSync(file), {
        [fc.toStringMethod]: { value: () => fc.stringify(file) },
      }),
    )

export const httpBody = (): fc.Arbitrary<HttpBody.HttpBody> =>
  fc.string().map(text =>
    Object.defineProperties(HttpBody.text(text), {
      [fc.toStringMethod]: { value: () => fc.stringify(text) },
    }),
  )

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
    .map(({ method, url, ...options }) =>
      Object.defineProperties(HttpClientRequest.make(method)(url, options), {
        [fc.toStringMethod]: { value: () => fc.stringify({ method, url, ...options }) },
      }),
    )

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
    .map(({ request, response }) =>
      Object.defineProperties(HttpClientResponse.fromWeb(request, response), {
        [fc.toStringMethod]: { value: () => fc.stringify({ request, response }) },
      }),
    )

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

export const nonDatasetDoi = (): fc.Arbitrary<Doi> =>
  fc.oneof(doi().filter(Predicate.not(Datasets.isDatasetDoi)), preprintDoi())

export const datasetDoi = (): fc.Arbitrary<Datasets.DatasetId['value']> => datasetId().map(id => id.value)

export const nonPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.oneof(url(), supportedDatasetUrl().map(Tuple.getFirst), unsupportedPreprintUrl())

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

export const datacitePreprintDoi = (): fc.Arbitrary<DatacitePreprintId['value']> =>
  datacitePreprintId().map(id => id.value)

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
      new URL(`https://zenodo.org/records/${id}`),
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
    africarxivOsfPreprintId(),
    biorxivPreprintId(),
    chemrxivPreprintId(),
    edarxivPreprintId(),
    medrxivPreprintId(),
    metaarxivPreprintId(),
    neurolibrePreprintId(),
    osfPreprintsPreprintId(),
    preprintsorgPreprintId(),
    psyarxivPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    scienceOpenPreprintId(),
    socarxivPreprintId(),
    ssrnPreprintId(),
    verixivPreprintId(),
    legacyCrossrefPreprintId(),
  )

export const legacyCrossrefPreprintId = (): fc.Arbitrary<LegacyCrossrefPreprintId> =>
  fc.oneof(
    advancePreprintId(),
    authoreaPreprintId(),
    curvenotePreprintId(),
    eartharxivPreprintId(),
    ecoevorxivPreprintId(),
    engrxivPreprintId(),
    techrxivPreprintId(),
  )

export const datacitePreprintId = (): fc.Arbitrary<DatacitePreprintId> =>
  fc.oneof(
    africarxivFigsharePreprintId(),
    africarxivUbuntunetPreprintId(),
    africarxivZenodoPreprintId(),
    arcadiaSciencePreprintId(),
    arxivPreprintId(),
    lifecycleJournalPreprintId(),
    osfPreprintId(),
    psychArchivesPreprintId(),
    zenodoPreprintId(),
  )

export const japanLinkCenterPreprintId = (): fc.Arbitrary<JapanLinkCenterPreprintId> => jxivPreprintId()

export const orcidId = (): fc.Arbitrary<OrcidId> =>
  fc
    .string({
      unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
      minLength: 4 + 4 + 4 + 3,
      maxLength: 4 + 4 + 4 + 3,
    })
    .map(value => mod11_2.generate(value).replace(/.{4}(?=.)/g, '$&-'))
    .filter(isOrcidId)

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

export const nonDatasetUrl = (): fc.Arbitrary<URL> =>
  fc.oneof(url(), supportedPreprintUrl().map(Tuple.getFirst), unsupportedPreprintUrl())

export const supportedDatasetUrl = (): fc.Arbitrary<[URL, Datasets.DatasetId]> => fc.oneof(dryadDatasetUrl())

export const dryadDatasetId = (): fc.Arbitrary<Datasets.DryadDatasetId> =>
  doi(constant('5061')).map(doi => new Datasets.DryadDatasetId({ value: doi }))

export const dryadDatasetUrl = (): fc.Arbitrary<[URL, Datasets.DryadDatasetId]> =>
  dryadDatasetId()
    .filter(id => !id.value.endsWith('/'))
    .map(id => [new URL(`https://datadryad.org/dataset/doi:${encodeURIComponent(id.value)}`), id])

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
  orcid?: fc.Arbitrary<OrcidId>
  persona?: fc.Arbitrary<AssignedAuthorInvite['persona']>
} = {}): fc.Arbitrary<AssignedAuthorInvite> =>
  fc.record(
    {
      status: constant('assigned'),
      emailAddress: emailAddress(),
      orcid: _orcid ?? orcidId(),
      persona: persona ?? constantFrom('public', 'pseudonym'),
      review: fc.integer({ min: 1 }),
    },
    !persona ? { requiredKeys: ['status', 'emailAddress', 'orcid', 'review'] } : {},
  )

export const completedAuthorInvite = ({
  orcid: _orcid,
}: { orcid?: fc.Arbitrary<OrcidId> } = {}): fc.Arbitrary<CompletedAuthorInvite> =>
  fc.record({ status: constant('completed'), orcid: _orcid ?? orcidId(), review: fc.integer({ min: 1 }) })

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

export const clubId = (): fc.Arbitrary<Clubs.ClubId> => constantFrom(...Clubs.ClubIdSchema.literals)

export const pseudonym = (): fc.Arbitrary<Pseudonym> =>
  fc.tuple(constantFrom(...colors), constantFrom(...animals)).map(parts => Pseudonym(capitalCase(parts.join(' '))))

export const profileId = (): fc.Arbitrary<ProfileId.ProfileId> => fc.oneof(orcidProfileId(), pseudonymProfileId())

export const orcidProfileId = (): fc.Arbitrary<ProfileId.OrcidProfileId> => orcidId().map(ProfileId.forOrcid)

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

export const plainTime = (): fc.Arbitrary<Temporal.PlainTime> =>
  fc
    .record({
      hour: fc.integer({ min: 0, max: 23 }),
      minute: fc.integer({ min: 0, max: 59 }),
      second: fc.integer({ min: 0, max: 59 }),
      millisecond: fc.integer({ min: 0, max: 999 }),
      microsecond: fc.integer({ min: 0, max: 999 }),
      nanosecond: fc.integer({ min: 0, max: 999 }),
    })
    .map(args => Temporal.PlainTime.from(args))

export const plainDateTime = (): fc.Arbitrary<Temporal.PlainDateTime> =>
  fc.tuple(plainDate(), plainTime()).map(([plainDate, plainTime]) => plainDate.toPlainDateTime(plainTime))

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
      Struct.entries(include).forEach(([key, value]) => {
        headers.set(key, value)
      })
      return headers
    })

export const statusCode = (): fc.Arbitrary<StatusCodes.StatusCode> =>
  constantFrom(...StatusCodes.StatusCodes.filter(status => status >= 200))

export const cacheableStatusCode = (): fc.Arbitrary<StatusCodes.CacheableStatusCodes> =>
  statusCode().filter(StatusCodes.isCacheable)

export const nonCacheableStatusCode = (): fc.Arbitrary<StatusCodes.NonCacheableStatusCodes> =>
  statusCode().filter(StatusCodes.isNonCacheable)

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
  body,
}: {
  headers?: fc.Arbitrary<Headers>
  status?: fc.Arbitrary<StatusCodes.StatusCode>
  json?: fc.Arbitrary<Json>
  body?: fc.Arbitrary<BodyInit>
} = {}): fc.Arbitrary<Response> =>
  fc
    .record({
      headers: headers_ ?? headers(),
      status:
        status ??
        statusCode().filter(status =>
          (json ?? body)
            ? ![StatusCodes.NoContent, StatusCodes.ResetContent].includes(status as never) &&
              (status < 300 || status >= 400)
            : true,
        ),
      body: json ? json.map(JSON.stringify) : (body ?? fc.string()),
    })
    .map(args => {
      return Object.defineProperties(
        new Response(
          ![StatusCodes.NoContent, StatusCodes.ResetContent].includes(args.status as never) &&
          (args.status < 300 || args.status >= 400)
            ? args.body
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

export const nonEmptyArray = <T>(
  arb: fc.Arbitrary<T>,
  constraints: fc.ArrayConstraints = {},
): fc.Arbitrary<Array.NonEmptyArray<T>> => fc.array(arb, { minLength: 1, ...constraints }).filter(Array.isNonEmptyArray)

export const nonEmptyString = (): fc.Arbitrary<NonEmptyString> => fc.string({ minLength: 1 }).filter(isNonEmptyString)

export const nonEmptyStringOf = (charArb: fc.Arbitrary<string>): fc.Arbitrary<NonEmptyString> =>
  fc.string({ unit: charArb, minLength: 1 }).filter(isNonEmptyString)

export const languageCode = (): fc.Arbitrary<LanguageCode> => constantFrom(...ISO6391.getAllCodes())

export const orcidLocale = (): fc.Arbitrary<OrcidLocale.OrcidLocale> => constantFrom(...OrcidLocale.OrcidLocales)

export const ghostPage = (): fc.Arbitrary<GhostPage> =>
  fc.record({
    html: html(),
    locale: supportedLocale(),
  })

export const publicPersona = (): fc.Arbitrary<Personas.PublicPersona> =>
  fc
    .record({
      orcidId: orcidId(),
      name: nonEmptyString(),
    })
    .map(args => new Personas.PublicPersona(args))

export const pseudonymPersona = (): fc.Arbitrary<Personas.PseudonymPersona> =>
  fc
    .record({
      pseudonym: pseudonym(),
    })
    .map(args => new Personas.PseudonymPersona(args))

export const persona = (): fc.Arbitrary<Personas.Persona> => fc.oneof(publicPersona(), pseudonymPersona())

export const user = ({ orcid: userOrcid }: { orcid?: fc.Arbitrary<User['orcid']> } = {}): fc.Arbitrary<User> =>
  fc.record({
    name: nonEmptyString(),
    orcid: userOrcid ?? orcidId(),
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
              orcid: orcidId(),
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

export const dataset = (): fc.Arbitrary<Datasets.Dataset> =>
  fc
    .record(
      {
        abstract: fc.record({
          language: languageCode(),
          text: html(),
        }),
        authors: nonEmptyArray(
          fc.record(
            {
              name: fc.string(),
              orcid: orcidId(),
            },
            { requiredKeys: ['name'] },
          ),
        ),
        id: datasetId(),
        posted: fc.oneof(plainDate(), plainYearMonth(), year()),
        title: fc.record({
          language: languageCode(),
          text: html(),
        }),
        url: url(),
      },
      { requiredKeys: ['authors', 'id', 'posted', 'title', 'url'] },
    )
    .map(args => new Datasets.Dataset(args))

export const datasetTitle = (): fc.Arbitrary<Datasets.DatasetTitle> =>
  fc
    .record({
      id: datasetId(),
      language: languageCode(),
      title: html(),
    })
    .map(args => new Datasets.DatasetTitle(args))

export const prereview = (): fc.Arbitrary<Prereview> =>
  fc
    .record({
      authors: fc.record({
        named: nonEmptyArray(fc.record({ name: fc.string(), orcid: orcidId() }, { requiredKeys: ['name'] })),
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

export const publishedDatasetReview = ({
  author,
}: {
  author?: fc.Arbitrary<DatasetReviews.PublishedReview['author']>
} = {}): fc.Arbitrary<DatasetReviews.PublishedReview> =>
  fc.record({
    author: author ?? fc.record({ orcidId: orcidId(), persona: constantFrom('public', 'pseudonym') }),
    dataset: datasetId(),
    doi: doi(),
    id: uuid(),
    questions: fc.record({
      qualityRating: maybe(
        fc.record({
          rating: constantFrom('excellent', 'fair', 'poor', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: fc.record({
        answer: constantFrom('yes', 'partly', 'no', 'unsure'),
        detail: maybe(nonEmptyString()),
      }),
      answerToIfTheDatasetHasEnoughMetadata: maybe(
        fc.record({
          answer: constantFrom('yes', 'partly', 'no', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetHasTrackedChanges: maybe(
        fc.record({
          answer: constantFrom('yes', 'partly', 'no', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetHasDataCensoredOrDeleted: maybe(
        fc.record({
          answer: constantFrom('yes', 'partly', 'no', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: maybe(
        fc.record({
          answer: constantFrom('yes', 'partly', 'no', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetSupportsRelatedConclusions: maybe(
        fc.record({
          answer: constantFrom('yes', 'partly', 'no', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetIsDetailedEnough: maybe(
        fc.record({
          answer: constantFrom('yes', 'partly', 'no', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetIsErrorFree: maybe(
        fc.record({
          answer: constantFrom('yes', 'partly', 'no', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetMattersToItsAudience: maybe(
        fc.record({
          answer: constantFrom('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetIsReadyToBeShared: maybe(
        fc.record({
          answer: constantFrom('yes', 'no', 'unsure'),
          detail: maybe(nonEmptyString()),
        }),
      ),
      answerToIfTheDatasetIsMissingAnything: maybe(nonEmptyString()),
    }),
    competingInterests: maybe(nonEmptyString()),
    published: plainDate(),
  })

export const datasetReviewPreview = ({
  author,
}: {
  author?: fc.Arbitrary<DatasetReviews.DatasetReviewPreview['author']>
} = {}): fc.Arbitrary<DatasetReviews.DatasetReviewPreview> =>
  fc.record<DatasetReviews.DatasetReviewPreview>({
    author: author ?? fc.record({ orcidId: orcidId(), persona: maybe(constantFrom('public', 'pseudonym')) }),
    dataset: datasetId(),
    competingInterests: competingInterestsForADatasetReviewWereDeclared().map(Struct.get('competingInterests')),
    qualityRating: maybe(ratedTheQualityOfTheDataset().map(Struct.pick('rating', 'detail'))),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: answeredIfTheDatasetFollowsFairAndCarePrinciples().map(
      Struct.pick('answer', 'detail'),
    ),
    answerToIfTheDatasetHasEnoughMetadata: maybe(
      answeredIfTheDatasetHasEnoughMetadata().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetHasTrackedChanges: maybe(
      answeredIfTheDatasetHasTrackedChanges().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetHasDataCensoredOrDeleted: maybe(
      answeredIfTheDatasetHasDataCensoredOrDeleted().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: maybe(
      answeredIfTheDatasetIsAppropriateForThisKindOfResearch().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetSupportsRelatedConclusions: maybe(
      answeredIfTheDatasetSupportsRelatedConclusions().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsDetailedEnough: maybe(
      answeredIfTheDatasetIsDetailedEnough().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsErrorFree: maybe(answeredIfTheDatasetIsErrorFree().map(Struct.pick('answer', 'detail'))),
    answerToIfTheDatasetMattersToItsAudience: maybe(
      answeredIfTheDatasetMattersToItsAudience().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsReadyToBeShared: maybe(
      answeredIfTheDatasetIsReadyToBeShared().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsMissingAnything: maybe(answeredIfTheDatasetIsMissingAnything().map(Struct.get('answer'))),
  })

export const datasetReviewDataForZenodoRecord = ({
  author,
}: {
  author?: fc.Arbitrary<DatasetReviews.DataForZenodoRecord['author']>
} = {}): fc.Arbitrary<DatasetReviews.DataForZenodoRecord> =>
  fc.record({
    author: author ?? fc.record({ orcidId: orcidId(), persona: constantFrom('public', 'pseudonym') }),
    dataset: datasetId(),
    competingInterests: competingInterestsForADatasetReviewWereDeclared().map(Struct.get('competingInterests')),
    qualityRating: maybe(ratedTheQualityOfTheDataset().map(Struct.pick('rating', 'detail'))),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: answeredIfTheDatasetFollowsFairAndCarePrinciples().map(
      Struct.pick('answer', 'detail'),
    ),
    answerToIfTheDatasetHasEnoughMetadata: maybe(
      answeredIfTheDatasetHasEnoughMetadata().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetHasTrackedChanges: maybe(
      answeredIfTheDatasetHasTrackedChanges().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetHasDataCensoredOrDeleted: maybe(
      answeredIfTheDatasetHasDataCensoredOrDeleted().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: maybe(
      answeredIfTheDatasetIsAppropriateForThisKindOfResearch().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetSupportsRelatedConclusions: maybe(
      answeredIfTheDatasetSupportsRelatedConclusions().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsDetailedEnough: maybe(
      answeredIfTheDatasetIsDetailedEnough().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsErrorFree: maybe(answeredIfTheDatasetIsErrorFree().map(Struct.pick('answer', 'detail'))),
    answerToIfTheDatasetMattersToItsAudience: maybe(
      answeredIfTheDatasetMattersToItsAudience().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsReadyToBeShared: maybe(
      answeredIfTheDatasetIsReadyToBeShared().map(Struct.pick('answer', 'detail')),
    ),
    answerToIfTheDatasetIsMissingAnything: answeredIfTheDatasetIsMissingAnything().map(Struct.get('answer')),
  })

export const commentWasStarted = ({
  commentId,
}: {
  commentId?: fc.Arbitrary<Events.CommentWasStarted['commentId']>
} = {}): fc.Arbitrary<Events.CommentWasStarted> =>
  fc
    .record({
      commentId: commentId ?? uuid(),
      prereviewId: fc.integer(),
      authorId: orcidId(),
    })
    .map(data => new Events.CommentWasStarted(data))

export const commentWasEntered = ({
  commentId,
}: {
  commentId?: fc.Arbitrary<Events.CommentWasEntered['commentId']>
} = {}): fc.Arbitrary<Events.CommentWasEntered> =>
  fc
    .record({
      commentId: commentId ?? uuid(),
      comment: html(),
    })
    .map(data => new Events.CommentWasEntered(data))

export const personaForCommentWasChosen = ({
  commentId,
}: {
  commentId?: fc.Arbitrary<Events.PersonaForCommentWasChosen['commentId']>
} = {}): fc.Arbitrary<Events.PersonaForCommentWasChosen> =>
  fc
    .record({
      commentId: commentId ?? uuid(),
      persona: constantFrom('public', 'pseudonym'),
    })
    .map(data => new Events.PersonaForCommentWasChosen(data))

export const competingInterestsForCommentWereDeclared = ({
  commentId,
}: {
  commentId?: fc.Arbitrary<Events.CompetingInterestsForCommentWereDeclared['commentId']>
} = {}): fc.Arbitrary<Events.CompetingInterestsForCommentWereDeclared> =>
  fc
    .record({
      commentId: commentId ?? uuid(),
      competingInterests: maybe(nonEmptyString()),
    })
    .map(data => new Events.CompetingInterestsForCommentWereDeclared(data))

export const existenceOfVerifiedEmailAddressForCommentWasConfirmed = ({
  commentId,
}: {
  commentId?: fc.Arbitrary<Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed['commentId']>
} = {}): fc.Arbitrary<Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed> =>
  fc
    .record({ commentId: commentId ?? uuid() })
    .map(data => new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed(data))

export const publicationOfCommentWasRequested = ({
  commentId,
}: {
  commentId?: fc.Arbitrary<Events.PublicationOfCommentWasRequested['commentId']>
} = {}): fc.Arbitrary<Events.PublicationOfCommentWasRequested> =>
  fc.record({ commentId: commentId ?? uuid() }).map(data => new Events.PublicationOfCommentWasRequested(data))

export const commentWasAssignedADoi = ({
  commentId,
}: {
  commentId?: fc.Arbitrary<Events.CommentWasAssignedADoi['commentId']>
} = {}): fc.Arbitrary<Events.CommentWasAssignedADoi> =>
  fc
    .record({
      commentId: commentId ?? uuid(),
      id: fc.integer(),
      doi: doi(),
    })
    .map(data => new Events.CommentWasAssignedADoi(data))

export const commentWasPublished = ({
  commentId,
}: {
  commentId?: fc.Arbitrary<Events.CommentWasPublished['commentId']>
} = {}): fc.Arbitrary<Events.CommentWasPublished> =>
  fc.record({ commentId: commentId ?? uuid() }).map(data => new Events.CommentWasPublished(data))

export const commentEvent = (
  args: {
    commentId?: fc.Arbitrary<Events.CommentEvent['commentId']>
  } = {},
): fc.Arbitrary<Events.CommentEvent> =>
  fc.oneof(
    commentWasStarted(args),
    commentWasEntered(args),
    personaForCommentWasChosen(args),
    competingInterestsForCommentWereDeclared(args),
    existenceOfVerifiedEmailAddressForCommentWasConfirmed(args),
    publicationOfCommentWasRequested(args),
    commentWasAssignedADoi(args),
    commentWasPublished(args),
  )

export const datasetReviewWasStarted = ({
  datasetId: _datasetId,
  datasetReviewId,
}: {
  datasetId?: fc.Arbitrary<Events.DatasetReviewWasStarted['datasetId']>
  datasetReviewId?: fc.Arbitrary<Events.DatasetReviewWasStarted['datasetReviewId']>
} = {}): fc.Arbitrary<Events.DatasetReviewWasStarted> =>
  fc
    .record({
      authorId: orcidId(),
      datasetId: _datasetId ?? datasetId(),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.DatasetReviewWasStarted(data))

export const ratedTheQualityOfTheDataset = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.RatedTheQualityOfTheDataset['datasetReviewId']>
} = {}): fc.Arbitrary<Events.RatedTheQualityOfTheDataset> =>
  fc
    .record({
      rating: constantFrom('excellent', 'fair', 'poor', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.RatedTheQualityOfTheDataset(data))

export const answeredIfTheDatasetFollowsFairAndCarePrinciples = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples> =>
  fc
    .record({
      answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples(data))

export const answeredIfTheDatasetHasEnoughMetadata = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetHasEnoughMetadata['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetHasEnoughMetadata> =>
  fc
    .record({
      answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetHasEnoughMetadata(data))

export const answeredIfTheDatasetHasTrackedChanges = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetHasTrackedChanges['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetHasTrackedChanges> =>
  fc
    .record({
      answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetHasTrackedChanges(data))

export const answeredIfTheDatasetHasDataCensoredOrDeleted = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted> =>
  fc
    .record({
      answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted(data))

export const answeredIfTheDatasetIsAppropriateForThisKindOfResearch = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch> =>
  fc
    .record({
      answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch(data))

export const answeredIfTheDatasetSupportsRelatedConclusions = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetSupportsRelatedConclusions['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetSupportsRelatedConclusions> =>
  fc
    .record({
      answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetSupportsRelatedConclusions(data))

export const answeredIfTheDatasetIsDetailedEnough = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetIsDetailedEnough['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetIsDetailedEnough> =>
  fc
    .record({
      answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetIsDetailedEnough(data))

export const answeredIfTheDatasetIsErrorFree = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetIsErrorFree['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetIsErrorFree> =>
  fc
    .record({
      answer: constantFrom('yes', 'partly', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetIsErrorFree(data))

export const answeredIfTheDatasetMattersToItsAudience = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetMattersToItsAudience['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetMattersToItsAudience> =>
  fc
    .record({
      answer: constantFrom('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetMattersToItsAudience(data))

export const answeredIfTheDatasetIsReadyToBeShared = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetIsReadyToBeShared['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetIsReadyToBeShared> =>
  fc
    .record({
      answer: constantFrom('yes', 'no', 'unsure'),
      detail: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetIsReadyToBeShared(data))

export const answeredIfTheDatasetIsMissingAnything = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.AnsweredIfTheDatasetIsMissingAnything['datasetReviewId']>
} = {}): fc.Arbitrary<Events.AnsweredIfTheDatasetIsMissingAnything> =>
  fc
    .record({
      answer: maybe(nonEmptyString()),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.AnsweredIfTheDatasetIsMissingAnything(data))

export const declaredThatTheCodeOfConductWasFollowedForADatasetReview = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview['datasetReviewId']>
} = {}): fc.Arbitrary<Events.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview> =>
  fc
    .record({
      datasetReviewId: datasetReviewId ?? uuid(),
      timestamp: instant(),
    })
    .map(data => new Events.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview(data))

export const personaForDatasetReviewWasChosen = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.PersonaForDatasetReviewWasChosen['datasetReviewId']>
} = {}): fc.Arbitrary<Events.PersonaForDatasetReviewWasChosen> =>
  fc
    .record({
      datasetReviewId: datasetReviewId ?? uuid(),
      persona: constantFrom('public', 'pseudonym'),
    })
    .map(data => new Events.PersonaForDatasetReviewWasChosen(data))

export const competingInterestsForADatasetReviewWereDeclared = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.CompetingInterestsForADatasetReviewWereDeclared['datasetReviewId']>
} = {}): fc.Arbitrary<Events.CompetingInterestsForADatasetReviewWereDeclared> =>
  fc
    .record({
      datasetReviewId: datasetReviewId ?? uuid(),
      competingInterests: maybe(nonEmptyString()),
    })
    .map(data => new Events.CompetingInterestsForADatasetReviewWereDeclared(data))

export const publicationOfDatasetReviewWasRequested = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.PublicationOfDatasetReviewWasRequested['datasetReviewId']>
} = {}): fc.Arbitrary<Events.PublicationOfDatasetReviewWasRequested> =>
  fc
    .record({ datasetReviewId: datasetReviewId ?? uuid() })
    .map(data => new Events.PublicationOfDatasetReviewWasRequested(data))

export const zenodoRecordForDatasetReviewWasCreated = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.ZenodoRecordForDatasetReviewWasCreated['datasetReviewId']>
} = {}): fc.Arbitrary<Events.ZenodoRecordForDatasetReviewWasCreated> =>
  fc
    .record({
      recordId: fc.integer(),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.ZenodoRecordForDatasetReviewWasCreated(data))

export const datasetReviewWasAssignedADoi = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.DatasetReviewWasAssignedADoi['datasetReviewId']>
} = {}): fc.Arbitrary<Events.DatasetReviewWasAssignedADoi> =>
  fc
    .record({
      doi: doi(),
      datasetReviewId: datasetReviewId ?? uuid(),
    })
    .map(data => new Events.DatasetReviewWasAssignedADoi(data))

export const datasetReviewWasPublished = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.DatasetReviewWasPublished['datasetReviewId']>
} = {}): fc.Arbitrary<Events.DatasetReviewWasPublished> =>
  fc
    .record({ datasetReviewId: datasetReviewId ?? uuid(), publicationDate: plainDate() })
    .map(data => new Events.DatasetReviewWasPublished(data))

export const zenodoRecordForDatasetReviewWasPublished = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.ZenodoRecordForDatasetReviewWasPublished['datasetReviewId']>
} = {}): fc.Arbitrary<Events.ZenodoRecordForDatasetReviewWasPublished> =>
  fc
    .record({ datasetReviewId: datasetReviewId ?? uuid() })
    .map(data => new Events.ZenodoRecordForDatasetReviewWasPublished(data))

export const datasetReviewDoiWasActivated = ({
  datasetReviewId,
}: {
  datasetReviewId?: fc.Arbitrary<Events.DatasetReviewDoiWasActivated['datasetReviewId']>
} = {}): fc.Arbitrary<Events.DatasetReviewDoiWasActivated> =>
  fc.record({ datasetReviewId: datasetReviewId ?? uuid() }).map(data => new Events.DatasetReviewDoiWasActivated(data))

export const datasetReviewEvent = (
  args: {
    datasetReviewId?: fc.Arbitrary<Events.DatasetReviewEvent['datasetReviewId']>
  } = {},
): fc.Arbitrary<Events.DatasetReviewEvent> =>
  fc.oneof(
    datasetReviewWasStarted(args),
    ratedTheQualityOfTheDataset(args),
    answeredIfTheDatasetFollowsFairAndCarePrinciples(args),
    answeredIfTheDatasetHasEnoughMetadata(args),
    answeredIfTheDatasetHasTrackedChanges(args),
    answeredIfTheDatasetHasDataCensoredOrDeleted(args),
    answeredIfTheDatasetIsAppropriateForThisKindOfResearch(args),
    answeredIfTheDatasetSupportsRelatedConclusions(args),
    answeredIfTheDatasetIsDetailedEnough(args),
    answeredIfTheDatasetIsErrorFree(args),
    answeredIfTheDatasetMattersToItsAudience(args),
    answeredIfTheDatasetIsReadyToBeShared(args),
    answeredIfTheDatasetIsMissingAnything(args),
    declaredThatTheCodeOfConductWasFollowedForADatasetReview(args),
    personaForDatasetReviewWasChosen(args),
    competingInterestsForADatasetReviewWereDeclared(args),
    publicationOfDatasetReviewWasRequested(args),
    zenodoRecordForDatasetReviewWasCreated(args),
    datasetReviewWasAssignedADoi(args),
    datasetReviewWasPublished(args),
    zenodoRecordForDatasetReviewWasPublished(args),
    datasetReviewDoiWasActivated(args),
  )

export const datasetReviewNextExpectedCommand = (): fc.Arbitrary<DatasetReviews.NextExpectedCommand> =>
  fc.constantFrom(
    'RateTheQuality',
    'AnswerIfTheDatasetFollowsFairAndCarePrinciples',
    'AnswerIfTheDatasetHasEnoughMetadata',
    'AnswerIfTheDatasetHasTrackedChanges',
    'AnswerIfTheDatasetHasDataCensoredOrDeleted',
    'AnswerIfTheDatasetIsAppropriateForThisKindOfResearch',
    'AnswerIfTheDatasetSupportsRelatedConclusions',
    'AnswerIfTheDatasetIsDetailedEnough',
    'AnswerIfTheDatasetIsErrorFree',
    'AnswerIfTheDatasetIsReadyToBeShared',
    'DeclareFollowingCodeOfConduct',
    'PublishDatasetReview',
  )

export const event = (): fc.Arbitrary<Events.Event> => fc.oneof(commentEvent(), datasetReviewEvent())

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
      authorId: orcidId(),
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
      authorId: orcidId(),
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
      authorId: orcidId(),
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
      authorId: orcidId(),
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
    authorId: orcidId(),
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
