import { Temporal } from '@js-temporal/polyfill'
import { animals, colors } from 'anonymus'
import { capitalCase } from 'case-anything'
import { mod11_2 } from 'cdigit'
import { type Doi, isDoi } from 'doi-ts'
import { Array, Either, HashSet, Option } from 'effect'
import type { Request, Response } from 'express'
import * as fc from 'fast-check'
import type * as F from 'fetch-fp-ts'
import type { Json, JsonRecord } from 'fp-ts/lib/Json.js'
import { not } from 'fp-ts/lib/Predicate.js'
import type { Refinement } from 'fp-ts/lib/Refinement.js'
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
import { type Uuid, isUuid } from 'uuid-ts'
import type {
  AssignedAuthorInvite,
  AuthorInvite,
  CompletedAuthorInvite,
  DeclinedAuthorInvite,
  OpenAuthorInvite,
} from '../src/author-invite.js'
import type { CareerStage } from '../src/career-stage.js'
import type { OrcidOAuthEnv } from '../src/connect-orcid/index.js'
import type {
  ContactEmailAddress,
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../src/contact-email-address.js'
import type { CrossrefPreprintId } from '../src/crossref.js'
import type { DatacitePreprintId } from '../src/datacite.js'
import type { Email } from '../src/email.js'
import * as Feedback from '../src/Feedback/index.js'
import { type Html, type PlainText, sanitizeHtml, html as toHtml, plainText as toPlainText } from '../src/html.js'
import type { IsOpenForRequests } from '../src/is-open-for-requests.js'
import type { Languages } from '../src/languages.js'
import { type SupportedLocale, SupportedLocales } from '../src/locales/index.js'
import type { Location } from '../src/location.js'
import assets from '../src/manifest.json' with { type: 'json' }
import type { OrcidToken } from '../src/orcid-token.js'
import type { Preprint, PreprintTitle } from '../src/preprint.js'
import { Prereview } from '../src/Prereview.js'
import type { ResearchInterests } from '../src/research-interests.js'
import type {
  FlashMessageResponse,
  LogInResponse,
  PageResponse,
  RedirectResponse,
  StreamlinePageResponse,
  TwoUpPageResponse,
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
import type { EmailAddress } from '../src/types/email-address.js'
import { type FieldId, fieldIds } from '../src/types/field.js'
import {
  type AfricarxivFigsharePreprintId,
  type AfricarxivOsfPreprintId,
  type AfricarxivPreprintId,
  type AfricarxivUbuntunetPreprintId,
  type AfricarxivZenodoPreprintId,
  type ArcadiaSciencePreprintId,
  type ArxivPreprintId,
  type AuthoreaPreprintId,
  type BiorxivOrMedrxivPreprintId,
  type BiorxivPreprintId,
  type ChemrxivPreprintId,
  type CurvenotePreprintId,
  type EartharxivPreprintId,
  type EcoevorxivPreprintId,
  type EdarxivPreprintId,
  type EngrxivPreprintId,
  type IndeterminatePreprintId,
  type MedrxivPreprintId,
  type MetaarxivPreprintId,
  type OsfPreprintId,
  type OsfPreprintsPreprintId,
  type PhilsciPreprintId,
  type PreprintId,
  type PreprintsorgPreprintId,
  type PsyarxivPreprintId,
  type PsychArchivesPreprintId,
  type ResearchSquarePreprintId,
  type ScieloPreprintId,
  type ScienceOpenPreprintId,
  type SocarxivPreprintId,
  type TechrxivPreprintId,
  type ZenodoOrAfricarxivPreprintId,
  type ZenodoPreprintId,
  isPreprintDoi,
} from '../src/types/preprint-id.js'
import type { OrcidProfileId, ProfileId, PseudonymProfileId } from '../src/types/profile-id.js'
import type { Pseudonym } from '../src/types/pseudonym.js'
import { type NonEmptyString, isNonEmptyString } from '../src/types/string.js'
import { type SubfieldId, subfieldIds } from '../src/types/subfield.js'
import type { UserOnboarding } from '../src/user-onboarding.js'
import type { User } from '../src/user.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

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

export function constantFrom<const T>(...values: Array<T>): Arbitrary<T> {
  return fc.constantFrom(...values)
}

export const set = <A>(arb: fc.Arbitrary<A>, constraints?: fc.UniqueArraySharedConstraints): fc.Arbitrary<Set<A>> =>
  fc.uniqueArray(arb, constraints).map(values => new Set(values))

const some = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Option.Option<A>> => arb.map(Option.some)

export const maybe = <A>(someArb: fc.Arbitrary<A>): fc.Arbitrary<Option.Option<A>> =>
  fc.oneof(some(someArb), fc.constant(Option.none()))

const left = <E>(arb: fc.Arbitrary<E>): fc.Arbitrary<Either.Either<never, E>> => arb.map(Either.left)

const right = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Either.Either<A>> => arb.map(Either.right)

export const either = <E, A>(leftArb: fc.Arbitrary<E>, rightArb: fc.Arbitrary<A>): fc.Arbitrary<Either.Either<A, E>> =>
  fc.oneof(left(leftArb), right(rightArb))

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
  fc.RecordValue<{ [K in keyof T]: T[K] }, TConstraints extends undefined ? { withDeletedKeys: true } : TConstraints>
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
        (constraints ?? { withDeletedKeys: true }) as never,
      ),
    )

export const uuid = (): fc.Arbitrary<Uuid> => fc.uuid().filter(isUuid)

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

export const supportedLocale = (): fc.Arbitrary<SupportedLocale> => constantFrom(...HashSet.values(SupportedLocales))

export const pageResponse = ({
  canonical,
  status,
}: {
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
        (js): js is Exclude<EndsWith<keyof typeof assets, '.js'>, 'collapsible-menu.js' | 'skip-link.js'> =>
          !['collapsible-menu.js', 'skip-link.js'].includes(js),
      ),
    ),
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
        (js): js is Exclude<EndsWith<keyof typeof assets, '.js'>, 'collapsible-menu.js' | 'skip-link.js'> =>
          !['collapsible-menu.js', 'skip-link.js'].includes(js),
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

export const flashMessageResponse = (): fc.Arbitrary<FlashMessageResponse> =>
  fc.record({
    _tag: constant('FlashMessageResponse'),
    location: fc.webPath(),
    message: fc.string(),
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

export const emailAddress = (): fc.Arbitrary<EmailAddress> => fc.emailAddress() as fc.Arbitrary<EmailAddress>

export const contactEmailAddress = (): fc.Arbitrary<ContactEmailAddress> =>
  fc.oneof(unverifiedContactEmailAddress(), verifiedContactEmailAddress())

export const unverifiedContactEmailAddress = (): fc.Arbitrary<UnverifiedContactEmailAddress> =>
  fc.record({
    type: constant('unverified'),
    value: emailAddress(),
    verificationToken: uuid(),
  })

export const verifiedContactEmailAddress = (): fc.Arbitrary<VerifiedContactEmailAddress> =>
  fc.record({
    type: constant('verified'),
    value: emailAddress(),
  })

export const error = (): fc.Arbitrary<Error> => fc.string().map(error => new Error(error))

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
    .filter(isDoi as Refinement<unknown, Doi<R>>)

export const nonPreprintDoi = (): fc.Arbitrary<Doi> => doi().filter(not(isPreprintDoi))

export const preprintDoi = (): fc.Arbitrary<Extract<PreprintId, { value: Doi }>['value']> =>
  preprintIdWithDoi().map(id => id.value)

export const nonPreprintUrl = (): fc.Arbitrary<URL> => fc.oneof(url(), unsupportedPreprintUrl())

export const supportedPreprintUrl = (): fc.Arbitrary<[URL, PreprintId]> =>
  fc.oneof(
    africarxivPreprintUrl(),
    arxivPreprintUrl(),
    authoreaPreprintUrl(),
    biorxivPreprintUrl(),
    edarxivPreprintUrl(),
    engrxivPreprintUrl(),
    medrxivPreprintUrl(),
    metaarxivPreprintUrl(),
    osfPreprintsPreprintUrl(),
    philsciPreprintUrl(),
    preprintsorgPreprintUrl(),
    psyarxivPreprintUrl(),
    researchSquarePreprintUrl(),
    scieloPreprintUrl(),
    scienceOpenPreprintUrl(),
    socarxivPreprintUrl(),
    techrxivPreprintUrl(),
  )

export const unsupportedPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.oneof(chemrxivPreprintUrl(), eartharxivPreprintUrl(), ecoevorxivPreprintUrl())

export const crossrefPreprintDoi = (): fc.Arbitrary<CrossrefPreprintId['value']> =>
  crossrefPreprintId().map(id => id.value)

export const datacitePreprintDoi = (): fc.Arbitrary<DatacitePreprintId['value']> =>
  datacitePreprintId().map(id => id.value)

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
  fc.record({
    type: constant('africarxiv'),
    value: doi(constant('6084')),
  })

export const africarxivFigsharePreprintUrl = (): fc.Arbitrary<[URL, AfricarxivFigsharePreprintId]> =>
  fc
    .tuple(
      fc.string({ unit: fc.oneof(alphanumeric(), constant('-')), minLength: 1 }),
      fc.string({ unit: fc.oneof(alphanumeric(), constantFrom('_')), minLength: 1 }),
      fc.integer({ min: 1 }),
    )
    .map(([type, title, id]) => [
      new URL(`https://africarxiv.figshare.com/articles/${type}/${title}/${id}`),
      { type: 'africarxiv', value: `10.6084/m9.figshare.${id}.v1` as Doi<'6084'> },
    ])

export const africarxivOsfPreprintId = (): fc.Arbitrary<AfricarxivOsfPreprintId> =>
  fc.record({
    type: constant('africarxiv'),
    value: doi(constant('31730')),
  })

export const africarxivOsfPreprintUrl = (): fc.Arbitrary<[URL, AfricarxivOsfPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/africarxiv/${id}`),
      { type: 'africarxiv', value: `10.31730/osf.io/${id}` as Doi<'31730'> },
    ])

export const africarxivUbuntunetPreprintId = (): fc.Arbitrary<AfricarxivUbuntunetPreprintId> =>
  fc.record({
    type: constant('africarxiv'),
    value: doi(constant('60763')),
  })

export const africarxivZenodoPreprintId = (): fc.Arbitrary<AfricarxivZenodoPreprintId> =>
  fc.record({
    type: constant('africarxiv'),
    value: doi(constant('5281')),
  })

export const arcadiaSciencePreprintId = (): fc.Arbitrary<ArcadiaSciencePreprintId> =>
  fc.record({
    type: constant('arcadia-science'),
    value: doi(constant('57844')),
  })

export const arxivPreprintId = (): fc.Arbitrary<ArxivPreprintId> =>
  fc.record({
    type: constant('arxiv'),
    value: doi(constant('48550')),
  })

export const arxivPreprintUrl = (): fc.Arbitrary<[URL, ArxivPreprintId]> =>
  fc
    .string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), minLength: 1 })
    .filter(suffix => isDoi(`10.48550/${suffix}`))
    .map(suffix => [
      new URL(`https://arxiv.org/abs/${suffix}`),
      { type: 'arxiv', value: `10.48550/arXiv.${suffix}` as Doi<'48550'> },
    ])

export const authoreaPreprintId = (): fc.Arbitrary<AuthoreaPreprintId> =>
  fc.record({
    type: constant('authorea'),
    value: doi(constant('22541')),
  })

export const authoreaPreprintUrl = (): fc.Arbitrary<[URL, AuthoreaPreprintId]> =>
  authoreaPreprintId().map(id => [new URL(`https://www.authorea.com/doi/full/${encodeURIComponent(id.value)}`), id])

export const biorxivPreprintId = (): fc.Arbitrary<BiorxivPreprintId> =>
  fc.record({
    type: constant('biorxiv'),
    value: doi(constant('1101')),
  })

export const biorxivPreprintUrl = (): fc.Arbitrary<[URL, BiorxivPreprintId]> =>
  fc
    .string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), minLength: 1 })
    .filter(suffix => isDoi(`10.1101/${suffix}`))
    .map(suffix => [
      new URL(`https://www.biorxiv.org/content/10.1101/${suffix}`),
      { type: 'biorxiv', value: `10.1101/${suffix}` as Doi<'1101'> },
    ])

export const chemrxivPreprintId = (): fc.Arbitrary<ChemrxivPreprintId> =>
  fc.record({
    type: constant('chemrxiv'),
    value: doi(constant('26434')),
  })

export const chemrxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => new URL(`https://chemrxiv.org/engage/chemrxiv/article-details/${id}`))

export const curvenotePreprintId = (): fc.Arbitrary<CurvenotePreprintId> =>
  fc.record({
    type: constant('curvenote'),
    value: doi(constant('62329')),
  })

export const eartharxivPreprintId = (): fc.Arbitrary<EartharxivPreprintId> =>
  fc.record({
    type: constant('eartharxiv'),
    value: doi(constant('31223')),
  })

export const eartharxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.integer({ min: 1 }).map(id => new URL(`https://eartharxiv.org/repository/view/${id}/`))

export const ecoevorxivPreprintId = (): fc.Arbitrary<EcoevorxivPreprintId> =>
  fc.record({
    type: constant('ecoevorxiv'),
    value: doi(constant('32942')),
  })

export const ecoevorxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.integer({ min: 1 }).map(id => new URL(`https://ecoevorxiv.org/repository/view/${id}/`))

export const edarxivPreprintId = (): fc.Arbitrary<EdarxivPreprintId> =>
  fc.record({
    type: constant('edarxiv'),
    value: doi(constant('35542')),
  })

export const edarxivPreprintUrl = (): fc.Arbitrary<[URL, EdarxivPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://edarxiv.org/${id}`),
      { type: 'edarxiv', value: `10.35542/osf.io/${id}` as Doi<'35542'> },
    ])

export const engrxivPreprintId = (): fc.Arbitrary<EngrxivPreprintId> =>
  fc.record({
    type: constant('engrxiv'),
    value: doi(constant('31224')),
  })

export const engrxivPreprintUrl = (): fc.Arbitrary<[URL, EngrxivPreprintId]> =>
  fc
    .integer({ min: 1 })
    .map(id => [
      new URL(`https://engrxiv.org/preprint/view/${id}`),
      { type: 'engrxiv', value: `10.31224/${id}` as Doi<'31224'> },
    ])

export const medrxivPreprintId = (): fc.Arbitrary<MedrxivPreprintId> =>
  fc.record({
    type: constant('medrxiv'),
    value: doi(constant('1101')),
  })

export const medrxivPreprintUrl = (): fc.Arbitrary<[URL, MedrxivPreprintId]> =>
  fc
    .string({ unit: constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), minLength: 1 })
    .filter(suffix => isDoi(`10.1101/${suffix}`))
    .map(suffix => [
      new URL(`https://www.medrxiv.org/content/10.1101/${suffix}`),
      { type: 'medrxiv', value: `10.1101/${suffix}` as Doi<'1101'> },
    ])

export const metaarxivPreprintId = (): fc.Arbitrary<MetaarxivPreprintId> =>
  fc.record({
    type: constant('metaarxiv'),
    value: doi(constant('31222')),
  })

export const metaarxivPreprintUrl = (): fc.Arbitrary<[URL, MetaarxivPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/metaarxiv/${id}`),
      { type: 'metaarxiv', value: `10.31222/osf.io/${id}` as Doi<'31222'> },
    ])

export const osfPreprintId = (): fc.Arbitrary<OsfPreprintId> =>
  fc.record({
    type: constant('osf'),
    value: doi(constant('17605')),
  })

export const osfPreprintsPreprintId = (): fc.Arbitrary<OsfPreprintsPreprintId> =>
  fc.record({
    type: constant('osf-preprints'),
    value: doi(constant('31219')),
  })

export const osfPreprintsPreprintUrl = (): fc.Arbitrary<[URL, OsfPreprintsPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/${id}`),
      { type: 'osf-preprints', value: `10.31219/osf.io/${id}` as Doi<'31219'> },
    ])

export const philsciPreprintId = (): fc.Arbitrary<PhilsciPreprintId> =>
  fc.record({
    type: constant('philsci'),
    value: fc.integer({ min: 1 }),
  })

export const philsciPreprintUrl = (): fc.Arbitrary<[URL, PhilsciPreprintId]> =>
  philsciPreprintId().map(id => [new URL(`https://philsci-archive.pitt.edu/${id.value}/`), id])

export const preprintsorgPreprintId = (): fc.Arbitrary<PreprintsorgPreprintId> =>
  fc.record({
    type: constant('preprints.org'),
    value: doi(constant('20944')),
  })

export const preprintsorgPreprintUrl = (): fc.Arbitrary<[URL, PreprintsorgPreprintId]> =>
  fc
    .tuple(
      fc.string({ unit: fc.oneof(alphanumeric(), constant('.')), minLength: 1 }).filter(id => !/^\.{1,2}$/.test(id)),
      fc.integer({ min: 1 }),
    )
    .map(([id, version]) => [
      new URL(`https://www.preprints.org/manuscript/${id}/v${version}`),
      { type: 'preprints.org', value: `10.20944/preprints${id}.v${version}` as Doi<'20944'> },
    ])

export const psyarxivPreprintId = (): fc.Arbitrary<PsyarxivPreprintId> =>
  fc.record({
    type: constant('psyarxiv'),
    value: doi(constant('31234')),
  })

export const psyarxivPreprintUrl = (): fc.Arbitrary<[URL, PsyarxivPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://psyarxiv.com/${id}`),
      { type: 'psyarxiv', value: `10.31234/osf.io/${id}` as Doi<'31234'> },
    ])

export const psychArchivesPreprintId = (): fc.Arbitrary<PsychArchivesPreprintId> =>
  fc.record({
    type: constant('psycharchives'),
    value: doi(constant('23668')),
  })

export const researchSquarePreprintId = (): fc.Arbitrary<ResearchSquarePreprintId> =>
  fc.record({
    type: constant('research-square'),
    value: doi(constant('21203')),
  })

export const researchSquarePreprintUrl = (): fc.Arbitrary<[URL, ResearchSquarePreprintId]> =>
  fc
    .tuple(fc.integer({ min: 1 }), fc.integer({ min: 1 }))
    .map(([id, version]) => [
      new URL(`https://www.researchsquare.com/article/rs-${id}/v${version}`),
      { type: 'research-square', value: `10.21203/rs.3.rs-${id}/v${version}` as Doi<'21203'> },
    ])

export const scieloPreprintId = (): fc.Arbitrary<ScieloPreprintId> =>
  fc.record({
    type: constant('scielo'),
    value: doi(constant('1590')),
  })

export const scieloPreprintUrl = (): fc.Arbitrary<[URL, ScieloPreprintId]> =>
  fc
    .integer({ min: 1 })
    .map(id => [
      new URL(`https://preprints.scielo.org/index.php/scielo/preprint/view/${id}`),
      { type: 'scielo', value: `10.1590/SciELOPreprints.${id}` as Doi<'1590'> },
    ])

export const scienceOpenPreprintId = (): fc.Arbitrary<ScienceOpenPreprintId> =>
  fc.record({
    type: constant('science-open'),
    value: doi(constant('14293')),
  })

export const scienceOpenPreprintUrl = (): fc.Arbitrary<[URL, ScienceOpenPreprintId]> =>
  scienceOpenPreprintId().map(({ value }) => [
    new URL(`https://www.scienceopen.com/hosted-document?doi=${encodeURIComponent(value)}`),
    { type: 'science-open', value },
  ])

export const socarxivPreprintId = (): fc.Arbitrary<SocarxivPreprintId> =>
  fc.record({
    type: constant('socarxiv'),
    value: doi(constant('31235')),
  })

export const socarxivPreprintUrl = (): fc.Arbitrary<[URL, SocarxivPreprintId]> =>
  fc
    .string({ unit: alphanumeric(), minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/socarxiv/${id}`),
      { type: 'socarxiv', value: `10.31235/osf.io/${id}` as Doi<'31235'> },
    ])

export const techrxivPreprintId = (): fc.Arbitrary<TechrxivPreprintId> =>
  fc.record({
    type: constant('techrxiv'),
    value: doi(constant('36227')),
  })

export const techrxivPreprintUrl = (): fc.Arbitrary<[URL, TechrxivPreprintId]> =>
  techrxivPreprintId().map(id => [new URL(`https://www.techrxiv.org/doi/full/${encodeURIComponent(id.value)}`), id])

export const zenodoPreprintId = (): fc.Arbitrary<ZenodoPreprintId> =>
  fc.record({
    type: constant('zenodo'),
    value: doi(constant('5281')),
  })

export const zenodoPreprintUrl = (): fc.Arbitrary<[URL, ZenodoPreprintId]> =>
  fc
    .integer({ min: 1 })
    .map(id => [
      new URL(`https://zenodo.org/record/${id}`),
      { type: 'zenodo', value: `10.5281/zenodo.${id}` as Doi<'5281'> },
    ])

export const biorxivOrMedrxivPreprintId = (): fc.Arbitrary<BiorxivOrMedrxivPreprintId> =>
  fc.record({
    type: constant('biorxiv-medrxiv'),
    value: doi(constant('1101')),
  })

export const zenodoOrAfricarxivPreprintId = (): fc.Arbitrary<ZenodoOrAfricarxivPreprintId> =>
  fc.record({
    type: constant('zenodo-africarxiv'),
    value: doi(constant('5281')),
  })

export const preprintId = (): fc.Arbitrary<PreprintId> => fc.oneof(philsciPreprintId(), preprintIdWithDoi())

export const preprintIdWithDoi = (): fc.Arbitrary<Extract<PreprintId, { value: Doi }>> =>
  fc.oneof(
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
    medrxivPreprintId(),
    metaarxivPreprintId(),
    osfPreprintId(),
    osfPreprintsPreprintId(),
    preprintsorgPreprintId(),
    psyarxivPreprintId(),
    psychArchivesPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    scienceOpenPreprintId(),
    socarxivPreprintId(),
    techrxivPreprintId(),
    zenodoPreprintId(),
  )

export const indeterminatePreprintId = (): fc.Arbitrary<IndeterminatePreprintId> =>
  fc.oneof(philsciPreprintId(), indeterminatePreprintIdWithDoi())

export const indeterminatePreprintIdWithDoi = (): fc.Arbitrary<Extract<IndeterminatePreprintId, { value: Doi }>> =>
  fc.oneof(preprintIdWithDoi(), biorxivOrMedrxivPreprintId(), zenodoOrAfricarxivPreprintId())

export const crossrefPreprintId = (): fc.Arbitrary<CrossrefPreprintId> =>
  fc.oneof(
    africarxivOsfPreprintId(),
    authoreaPreprintId(),
    biorxivPreprintId(),
    chemrxivPreprintId(),
    curvenotePreprintId(),
    eartharxivPreprintId(),
    ecoevorxivPreprintId(),
    edarxivPreprintId(),
    engrxivPreprintId(),
    medrxivPreprintId(),
    metaarxivPreprintId(),
    osfPreprintsPreprintId(),
    preprintsorgPreprintId(),
    psyarxivPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    scienceOpenPreprintId(),
    socarxivPreprintId(),
    techrxivPreprintId(),
  )

export const datacitePreprintId = (): fc.Arbitrary<DatacitePreprintId> =>
  fc.oneof(
    africarxivFigsharePreprintId(),
    africarxivUbuntunetPreprintId(),
    africarxivZenodoPreprintId(),
    arcadiaSciencePreprintId(),
    arxivPreprintId(),
    osfPreprintId(),
    psychArchivesPreprintId(),
    zenodoPreprintId(),
  )

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
    africarxivUbuntunetPreprintId(),
    arxivPreprintId(),
    biorxivPreprintId(),
    ecoevorxivPreprintId(),
    edarxivPreprintId(),
    medrxivPreprintId(),
    osfPreprintsPreprintId(),
    preprintsorgPreprintId(),
    psyarxivPreprintId(),
    scieloPreprintId(),
    socarxivPreprintId(),
  )

export const notAReviewRequestPreprintId = (): fc.Arbitrary<Exclude<PreprintId, ReviewRequestPreprintId>> =>
  fc.oneof(
    africarxivFigsharePreprintId(),
    africarxivOsfPreprintId(),
    africarxivZenodoPreprintId(),
    arcadiaSciencePreprintId(),
    authoreaPreprintId(),
    chemrxivPreprintId(),
    curvenotePreprintId(),
    eartharxivPreprintId(),
    engrxivPreprintId(),
    metaarxivPreprintId(),
    osfPreprintId(),
    philsciPreprintId(),
    psychArchivesPreprintId(),
    researchSquarePreprintId(),
    scienceOpenPreprintId(),
    techrxivPreprintId(),
    zenodoPreprintId(),
  )

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
  fc.record({ userId: nonEmptyString(), accessToken: nonEmptyString(), scopes: set(nonEmptyString()) })

export const orcidToken = (): fc.Arbitrary<OrcidToken> =>
  fc.record({
    accessToken: nonEmptyString(),
    scopes: set(nonEmptyString()),
  })

export const clubId = (): fc.Arbitrary<ClubId> => constantFrom(...clubIds)

export const pseudonym = (): fc.Arbitrary<Pseudonym> =>
  fc.tuple(constantFrom(...colors), constantFrom(...animals)).map(parts => capitalCase(parts.join(' ')) as Pseudonym)

export const profileId = (): fc.Arbitrary<ProfileId> => fc.oneof(orcidProfileId(), pseudonymProfileId())

export const orcidProfileId = (): fc.Arbitrary<OrcidProfileId> =>
  fc.record({
    type: constant('orcid'),
    value: orcid(),
  })

export const pseudonymProfileId = (): fc.Arbitrary<PseudonymProfileId> =>
  fc.record({
    type: constant('pseudonym'),
    value: pseudonym(),
  })

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

export const url = (): fc.Arbitrary<URL> => fc.webUrl().map(url => new URL(url))

export const requestMethod = (): fc.Arbitrary<RequestMethod> =>
  constantFrom('CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE')

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

export const statusCode = (): fc.Arbitrary<Status> => constantFrom(...Object.values(Status))

export const cacheableStatusCode = (): fc.Arbitrary<CacheableStatusCodes> => statusCode().filter(isCacheable)

export const nonCacheableStatusCode = (): fc.Arbitrary<NonCacheableStatusCodes> => statusCode().filter(isNonCacheable)

export const fetchResponse = ({
  headers: headers_,
  status,
  json,
  text,
}: {
  headers?: fc.Arbitrary<Headers>
  status?: fc.Arbitrary<number>
  json?: fc.Arbitrary<Json>
  text?: fc.Arbitrary<string>
} = {}): fc.Arbitrary<F.Response> =>
  fc
    .record({
      headers: headers_ ?? headers(),
      status: status ?? fc.integer(),
      statusText: fc.string(),
      url: fc.string(),
      text: json ? json.map(JSON.stringify) : (text ?? fc.string()),
    })
    .map(args =>
      Object.defineProperties(
        { ...args, clone: shouldNotBeCalled, text: () => Promise.resolve(args.text) },
        { [fc.toStringMethod]: { value: () => fc.stringify(args) } },
      ),
    )

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
} = {}): fc.Arbitrary<Request> =>
  fc
    .record({
      body: body ?? constant(undefined),
      headers: headers ?? constant({}),
      method: method ?? requestMethod(),
      url: path ? fc.tuple(path, url()).map(([path, base]) => new URL(path, base).href) : fc.webUrl(),
    })
    .map(args =>
      Object.defineProperties(createRequest(args), { [fc.toStringMethod]: { value: () => fc.stringify(args) } }),
    )

export const response = (): fc.Arbitrary<Response> =>
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
      license: constant('CC-BY-4.0'),
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

export const commentWasStarted = (): fc.Arbitrary<Feedback.CommentWasStarted> =>
  fc
    .record({
      prereviewId: fc.integer(),
      authorId: orcid(),
    })
    .map(data => new Feedback.CommentWasStarted(data))

export const commentWasEntered = (): fc.Arbitrary<Feedback.CommentWasEntered> =>
  fc
    .record({
      comment: html(),
    })
    .map(data => new Feedback.CommentWasEntered(data))

export const personaWasChosen = (): fc.Arbitrary<Feedback.PersonaWasChosen> =>
  fc
    .record({
      persona: constantFrom('public', 'pseudonym'),
    })
    .map(data => new Feedback.PersonaWasChosen(data))

export const competingInterestsWereDeclared = (): fc.Arbitrary<Feedback.CompetingInterestsWereDeclared> =>
  fc
    .record({
      competingInterests: maybe(nonEmptyString()),
    })
    .map(data => new Feedback.CompetingInterestsWereDeclared(data))

export const commentPublicationWasRequested = (): fc.Arbitrary<Feedback.CommentPublicationWasRequested> =>
  fc.constant(new Feedback.CommentPublicationWasRequested())

export const doiWasAssigned = (): fc.Arbitrary<Feedback.DoiWasAssigned> =>
  fc
    .record({
      id: fc.integer(),
      doi: doi(),
    })
    .map(data => new Feedback.DoiWasAssigned(data))

export const commentWasPublished = (): fc.Arbitrary<Feedback.CommentWasPublished> =>
  fc.constant(new Feedback.CommentWasPublished())

export const commentEvent = (): fc.Arbitrary<Feedback.CommentEvent> =>
  fc.oneof(
    commentWasStarted(),
    commentWasEntered(),
    personaWasChosen(),
    competingInterestsWereDeclared(),
    commentPublicationWasRequested(),
    doiWasAssigned(),
    commentWasPublished(),
  )

export const feedbackWasAlreadyStarted = (): fc.Arbitrary<Feedback.FeedbackWasAlreadyStarted> =>
  fc.constant(new Feedback.FeedbackWasAlreadyStarted())

export const feedbackHasNotBeenStarted = (): fc.Arbitrary<Feedback.FeedbackHasNotBeenStarted> =>
  fc.constant(new Feedback.FeedbackHasNotBeenStarted())

export const feedbackIsIncomplete = (): fc.Arbitrary<Feedback.FeedbackIsIncomplete> =>
  fc.constant(new Feedback.FeedbackIsIncomplete())

export const feedbackIsBeingPublished = (): fc.Arbitrary<Feedback.FeedbackIsBeingPublished> =>
  fc.constant(new Feedback.FeedbackIsBeingPublished())

export const feedbackWasAlreadyPublished = (): fc.Arbitrary<Feedback.FeedbackWasAlreadyPublished> =>
  fc.constant(new Feedback.FeedbackWasAlreadyPublished())

export const feedbackError = (): fc.Arbitrary<Feedback.FeedbackError> =>
  fc.oneof(
    feedbackWasAlreadyStarted(),
    feedbackHasNotBeenStarted(),
    feedbackIsIncomplete(),
    feedbackIsBeingPublished(),
    feedbackWasAlreadyPublished(),
  )

export const commentNotStarted = (): fc.Arbitrary<Feedback.CommentNotStarted> =>
  constant(new Feedback.CommentNotStarted())

export const commentInProgress = ({
  codeOfConductAgreed,
  competingInterests,
  comment,
  persona,
}: {
  codeOfConductAgreed?: fc.Arbitrary<Feedback.CommentInProgress['codeOfConductAgreed']>
  competingInterests?: fc.Arbitrary<Feedback.CommentInProgress['competingInterests']>
  comment?: fc.Arbitrary<Feedback.CommentInProgress['comment']>
  persona?: fc.Arbitrary<Feedback.CommentInProgress['persona']>
} = {}): fc.Arbitrary<Feedback.CommentInProgress> =>
  fc
    .record({
      authorId: orcid(),
      prereviewId: fc.integer(),
      comment: comment ?? fc.option(html(), { nil: undefined }),
      competingInterests: competingInterests ?? fc.option(maybe(nonEmptyString()), { nil: undefined }),
      codeOfConductAgreed: codeOfConductAgreed ?? constantFrom(true, undefined),
      persona: persona ?? fc.option(constantFrom('public', 'pseudonym'), { nil: undefined }),
    })
    .map(data => new Feedback.CommentInProgress(data))

export const commentReadyForPublishing = (): fc.Arbitrary<Feedback.CommentReadyForPublishing> =>
  fc
    .record({
      authorId: orcid(),
      competingInterests: maybe(nonEmptyString()),
      comment: html(),
      persona: constantFrom('public', 'pseudonym'),
      prereviewId: fc.integer(),
    })
    .map(data => new Feedback.CommentReadyForPublishing(data))

export const commentBeingPublished = ({
  doi: _doi,
  id: _id,
}: {
  doi?: fc.Arbitrary<Feedback.CommentBeingPublished['doi']>
  id?: fc.Arbitrary<Feedback.CommentBeingPublished['id']>
} = {}): fc.Arbitrary<Feedback.CommentBeingPublished> =>
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
    .map(data => new Feedback.CommentBeingPublished(data))

export const commentPublished = (): fc.Arbitrary<Feedback.CommentPublished> =>
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
    .map(data => new Feedback.CommentPublished(data))

export const feedbackState = (): fc.Arbitrary<Feedback.CommentState> =>
  fc.oneof(
    commentNotStarted(),
    commentInProgress(),
    commentReadyForPublishing(),
    commentBeingPublished(),
    commentPublished(),
  )

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
