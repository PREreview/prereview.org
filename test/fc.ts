import { fc } from '@fast-check/jest'
import { Temporal } from '@js-temporal/polyfill'
import { animals, colors } from 'anonymus'
import { capitalCase } from 'capital-case'
import { mod11_2 } from 'cdigit'
import { type Doi, isDoi } from 'doi-ts'
import type { Request, Response } from 'express'
import type * as F from 'fetch-fp-ts'
import { isNonEmpty } from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import type { Json, JsonRecord } from 'fp-ts/Json'
import type { NonEmptyArray } from 'fp-ts/NonEmptyArray'
import { not } from 'fp-ts/Predicate'
import type { Refinement } from 'fp-ts/Refinement'
import type * as H from 'hyper-ts'
import { Status } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import { ExpressConnection } from 'hyper-ts/express'
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
import type { CareerStage } from '../src/career-stage'
import type {
  ContactEmailAddress,
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../src/contact-email-address'
import type { CrossrefPreprintId } from '../src/crossref'
import type { DatacitePreprintId } from '../src/datacite'
import type { Email } from '../src/email'
import { type Html, type PlainText, sanitizeHtml, html as toHtml, plainText as toPlainText } from '../src/html'
import type { IsOpenForRequests } from '../src/is-open-for-requests'
import type { Languages } from '../src/languages'
import type { Location } from '../src/location'
import * as assets from '../src/manifest.json'
import type { Preprint, PreprintTitle } from '../src/preprint'
import type { ResearchInterests } from '../src/research-interests'
import type {
  FlashMessageResponse,
  LogInResponse,
  PageResponse,
  RedirectResponse,
  StreamlinePageResponse,
  TwoUpPageResponse,
} from '../src/response'
import type { SlackUser } from '../src/slack-user'
import type { SlackUserId } from '../src/slack-user-id'
import type { ClubId } from '../src/types/club-id'
import type { EmailAddress } from '../src/types/email-address'
import {
  type AfricarxivFigsharePreprintId,
  type AfricarxivOsfPreprintId,
  type AfricarxivPreprintId,
  type AfricarxivZenodoPreprintId,
  type ArxivPreprintId,
  type AuthoreaPreprintId,
  type BiorxivOrMedrxivPreprintId,
  type BiorxivPreprintId,
  type ChemrxivPreprintId,
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
  type ResearchSquarePreprintId,
  type ScieloPreprintId,
  type ScienceOpenPreprintId,
  type SocarxivPreprintId,
  type ZenodoOrAfricarxivPreprintId,
  type ZenodoPreprintId,
  isPreprintDoi,
} from '../src/types/preprint-id'
import type { OrcidProfileId, ProfileId, PseudonymProfileId } from '../src/types/profile-id'
import type { Pseudonym } from '../src/types/pseudonym'
import { type NonEmptyString, isNonEmptyString } from '../src/types/string'
import type { User } from '../src/user'
import type { UserOnboarding } from '../src/user-onboarding'
import { shouldNotBeCalled } from './should-not-be-called'

if (typeof process.env['FAST_CHECK_NUM_RUNS'] === 'string') {
  fc.configureGlobal({ ...fc.readConfigureGlobal(), numRuns: parseInt(process.env['FAST_CHECK_NUM_RUNS'], 10) })
}

export type Arbitrary<T> = fc.Arbitrary<T>

export const {
  anything,
  array,
  boolean,
  constant,
  constantFrom,
  dictionary,
  integer,
  lorem,
  oneof,
  option,
  record,
  string,
  stringOf,
  tuple,
  webUrl,
} = fc

export const set = <A>(arb: fc.Arbitrary<A>, constraints?: fc.UniqueArraySharedConstraints): fc.Arbitrary<Set<A>> =>
  fc.uniqueArray(arb, constraints).map(values => new Set(values))

const left = <E>(arb: fc.Arbitrary<E>): fc.Arbitrary<E.Either<E, never>> => arb.map(E.left)

const right = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<E.Either<never, A>> => arb.map(E.right)

export const either = <E, A>(leftArb: fc.Arbitrary<E>, rightArb: fc.Arbitrary<A>): fc.Arbitrary<E.Either<E, A>> =>
  fc.oneof(left(leftArb), right(rightArb))

export const json = (): fc.Arbitrary<Json> => fc.jsonValue() as fc.Arbitrary<Json>

export const jsonRecord = (): fc.Arbitrary<JsonRecord> => fc.dictionary(fc.string(), json())

export const alphanumeric = (): fc.Arbitrary<string> =>
  fc.mapToConstant(
    { num: 26, build: v => String.fromCharCode(v + 0x61) },
    { num: 10, build: v => String.fromCharCode(v + 0x30) },
  )

export const invisibleCharacter = (): fc.Arbitrary<string> => fc.oneof(lineTerminator(), whiteSpaceCharacter())

export const lineTerminator = (): fc.Arbitrary<string> => fc.constantFrom('\n', '\r', '\u2028', '\u2029')

export const whiteSpaceCharacter = (): fc.Arbitrary<string> =>
  fc.constantFrom(
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

export const pageResponse = ({
  canonical,
}: {
  canonical?: fc.Arbitrary<PageResponse['canonical']>
} = {}): fc.Arbitrary<PageResponse> =>
  fc.record({
    _tag: fc.constant('PageResponse' as const),
    canonical: canonical ?? fc.option(fc.string(), { nil: undefined }),
    current: fc.option(
      fc.constantFrom(
        'about-us' as const,
        'clubs' as const,
        'code-of-conduct' as const,
        'edia-statement' as const,
        'funding' as const,
        'home' as const,
        'how-to-use' as const,
        'live-reviews' as const,
        'my-details' as const,
        'partners' as const,
        'people' as const,
        'privacy-policy' as const,
        'reviews' as const,
        'trainings' as const,
      ),
      { nil: undefined },
    ),
    skipToLabel: fc.constant('main' as const),
    status: statusCode(),
    title: plainText(),
    main: html(),
    js: fc.array(
      js().filter((js): js is Exclude<EndsWith<keyof typeof assets, '.js'>, 'skip-link.js'> => js !== 'skip-link.js'),
    ),
  })

export const streamlinePageResponse = ({
  canonical,
}: {
  canonical?: fc.Arbitrary<StreamlinePageResponse['canonical']>
} = {}): fc.Arbitrary<StreamlinePageResponse> =>
  fc.record({
    _tag: fc.constant('StreamlinePageResponse' as const),
    canonical: canonical ?? fc.option(fc.string(), { nil: undefined }),
    current: fc.option(
      fc.constantFrom(
        'about-us' as const,
        'clubs' as const,
        'code-of-conduct' as const,
        'edia-statement' as const,
        'funding' as const,
        'home' as const,
        'how-to-use' as const,
        'live-reviews' as const,
        'my-details' as const,
        'partners' as const,
        'people' as const,
        'privacy-policy' as const,
        'reviews' as const,
        'trainings' as const,
      ),
      { nil: undefined },
    ),
    skipToLabel: fc.constant('main' as const),
    status: statusCode(),
    title: plainText(),
    main: html(),
    js: fc.array(
      js().filter((js): js is Exclude<EndsWith<keyof typeof assets, '.js'>, 'skip-link.js'> => js !== 'skip-link.js'),
    ),
  })

export const twoUpPageResponse = (): fc.Arbitrary<TwoUpPageResponse> =>
  fc.record({
    _tag: fc.constant('TwoUpPageResponse' as const),
    canonical: fc.string(),
    title: plainText(),
    h1: html(),
    aside: html(),
    main: html(),
  })

export const redirectResponse = (): fc.Arbitrary<RedirectResponse> =>
  fc.record({
    _tag: fc.constant('RedirectResponse' as const),
    status: fc.constantFrom(Status.SeeOther, Status.Found),
    location: fc.oneof(fc.webPath(), url()),
  })

export const flashMessageResponse = (): fc.Arbitrary<FlashMessageResponse> =>
  fc.record({
    _tag: fc.constant('FlashMessageResponse' as const),
    location: fc.webPath(),
    message: fc.string(),
  })

export const logInResponse = (): fc.Arbitrary<LogInResponse> =>
  fc.record({
    _tag: fc.constant('LogInResponse' as const),
    location: fc.webPath(),
  })

const asset = (): fc.Arbitrary<keyof typeof assets> =>
  fc.constantFrom(...(Object.keys(assets) as Array<keyof typeof assets>))

const js = (): fc.Arbitrary<EndsWith<keyof typeof assets, '.js'>> =>
  asset().filter((asset): asset is EndsWith<typeof asset, '.js'> => asset.endsWith('.js'))

export const emailAddress = (): fc.Arbitrary<EmailAddress> => fc.emailAddress() as fc.Arbitrary<EmailAddress>

export const contactEmailAddress = (): fc.Arbitrary<ContactEmailAddress> =>
  fc.oneof(unverifiedContactEmailAddress(), verifiedContactEmailAddress())

export const unverifiedContactEmailAddress = (): fc.Arbitrary<UnverifiedContactEmailAddress> =>
  fc.record({
    type: fc.constant('unverified'),
    value: emailAddress(),
    verificationToken: uuid(),
  })

export const verifiedContactEmailAddress = (): fc.Arbitrary<VerifiedContactEmailAddress> =>
  fc.record({
    type: fc.constant('verified'),
    value: emailAddress(),
  })

export const error = (): fc.Arbitrary<Error> => fc.string().map(error => new Error(error))

export const cookieName = (): fc.Arbitrary<string> => fc.lorem({ maxCount: 1 })

export const html = (): fc.Arbitrary<Html> => fc.lorem().map(text => toHtml`<p>${text}</p>`)

export const sanitisedHtml = (): fc.Arbitrary<Html> => fc.string().map(sanitizeHtml)

export const plainText = (): fc.Arbitrary<PlainText> => fc.string().map(toPlainText)

export const oauth = (): fc.Arbitrary<Omit<OAuthEnv['oauth'], 'redirectUri'>> =>
  fc.record({
    authorizeUrl: url(),
    clientId: fc.string(),
    clientSecret: fc.string(),
    tokenUrl: url(),
  })

export const doiRegistrant = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 2 }),
      fc.array(fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1 })),
    )
    .map(([one, two]) => [one, ...two].join('.'))

export const doi = <R extends string>(withRegistrant?: fc.Arbitrary<R>): fc.Arbitrary<Doi<R>> =>
  fc
    .tuple(withRegistrant ?? doiRegistrant(), fc.unicodeString({ minLength: 1 }))
    .map(([prefix, suffix]) => `10.${prefix}/${suffix}`)
    .filter(isDoi as Refinement<unknown, Doi<R>>)

export const nonPreprintDoi = (): fc.Arbitrary<Doi> => doi().filter(not(isPreprintDoi))

export const preprintDoi = (): fc.Arbitrary<Extract<PreprintId, { value: Doi }>['value']> =>
  preprintIdWithDoi().map(id => id.value)

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
  )

export const unsupportedPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.oneof(chemrxivPreprintUrl(), eartharxivPreprintUrl(), ecoevorxivPreprintUrl())

export const crossrefPreprintDoi = (): fc.Arbitrary<CrossrefPreprintId['value']> =>
  crossrefPreprintId().map(id => id.value)

export const datacitePreprintDoi = (): fc.Arbitrary<DatacitePreprintId['value']> =>
  datacitePreprintId().map(id => id.value)

export const africarxivPreprintId = (): fc.Arbitrary<AfricarxivPreprintId> =>
  fc.oneof(africarxivFigsharePreprintId(), africarxivOsfPreprintId(), africarxivZenodoPreprintId())

export const africarxivPreprintUrl = (): fc.Arbitrary<[URL, AfricarxivPreprintId]> =>
  fc.oneof(africarxivFigsharePreprintUrl(), africarxivOsfPreprintUrl())

export const africarxivFigsharePreprintId = (): fc.Arbitrary<AfricarxivFigsharePreprintId> =>
  fc.record({
    type: fc.constant('africarxiv'),
    value: doi(fc.constant('6084')),
  })

export const africarxivFigsharePreprintUrl = (): fc.Arbitrary<[URL, AfricarxivFigsharePreprintId]> =>
  fc
    .tuple(
      fc.stringOf(fc.oneof(alphanumeric(), fc.constant('-')), { minLength: 1 }),
      fc.stringOf(fc.oneof(alphanumeric(), fc.constantFrom('_')), { minLength: 1 }),
      fc.integer({ min: 1 }),
    )
    .map(([type, title, id]) => [
      new URL(`https://africarxiv.figshare.com/articles/${type}/${title}/${id}`),
      { type: 'africarxiv', value: `10.6084/m9.figshare.${id}.v1` as Doi<'6084'> },
    ])

export const africarxivOsfPreprintId = (): fc.Arbitrary<AfricarxivOsfPreprintId> =>
  fc.record({
    type: fc.constant('africarxiv'),
    value: doi(fc.constant('31730')),
  })

export const africarxivOsfPreprintUrl = (): fc.Arbitrary<[URL, AfricarxivOsfPreprintId]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/africarxiv/${id}`),
      { type: 'africarxiv', value: `10.31730/osf.io/${id}` as Doi<'31730'> },
    ])

export const africarxivZenodoPreprintId = (): fc.Arbitrary<AfricarxivZenodoPreprintId> =>
  fc.record({
    type: fc.constant('africarxiv'),
    value: doi(fc.constant('5281')),
  })

export const arxivPreprintId = (): fc.Arbitrary<ArxivPreprintId> =>
  fc.record({
    type: fc.constant('arxiv'),
    value: doi(fc.constant('48550')),
  })

export const arxivPreprintUrl = (): fc.Arbitrary<[URL, ArxivPreprintId]> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), { minLength: 1 })
    .filter(suffix => isDoi(`10.48550/${suffix}`))
    .map(suffix => [
      new URL(`https://arxiv.org/abs/${suffix}`),
      { type: 'arxiv', value: `10.48550/arXiv.${suffix}` as Doi<'48550'> },
    ])

export const authoreaPreprintId = (): fc.Arbitrary<AuthoreaPreprintId> =>
  fc.record({
    type: fc.constant('authorea'),
    value: doi(fc.constant('22541')),
  })

export const authoreaPreprintUrl = (): fc.Arbitrary<[URL, AuthoreaPreprintId]> =>
  authoreaPreprintId().map(id => [new URL(`https://www.authorea.com/doi/full/${encodeURIComponent(id.value)}`), id])

export const biorxivPreprintId = (): fc.Arbitrary<BiorxivPreprintId> =>
  fc.record({
    type: fc.constant('biorxiv'),
    value: doi(fc.constant('1101')),
  })

export const biorxivPreprintUrl = (): fc.Arbitrary<[URL, BiorxivPreprintId]> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), { minLength: 1 })
    .filter(suffix => isDoi(`10.1101/${suffix}`))
    .map(suffix => [
      new URL(`https://www.biorxiv.org/content/10.1101/${suffix}`),
      { type: 'biorxiv', value: `10.1101/${suffix}` as Doi<'1101'> },
    ])

export const chemrxivPreprintId = (): fc.Arbitrary<ChemrxivPreprintId> =>
  fc.record({
    type: fc.constant('chemrxiv'),
    value: doi(fc.constant('26434')),
  })

export const chemrxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => new URL(`https://chemrxiv.org/engage/chemrxiv/article-details/${id}`))

export const eartharxivPreprintId = (): fc.Arbitrary<EartharxivPreprintId> =>
  fc.record({
    type: fc.constant('eartharxiv'),
    value: doi(fc.constant('31223')),
  })

export const eartharxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.integer({ min: 1 }).map(id => new URL(`https://eartharxiv.org/repository/view/${id}/`))

export const ecoevorxivPreprintId = (): fc.Arbitrary<EcoevorxivPreprintId> =>
  fc.record({
    type: fc.constant('ecoevorxiv'),
    value: doi(fc.constant('32942')),
  })

export const ecoevorxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.integer({ min: 1 }).map(id => new URL(`https://ecoevorxiv.org/repository/view/${id}/`))

export const edarxivPreprintId = (): fc.Arbitrary<EdarxivPreprintId> =>
  fc.record({
    type: fc.constant('edarxiv'),
    value: doi(fc.constant('35542')),
  })

export const edarxivPreprintUrl = (): fc.Arbitrary<[URL, EdarxivPreprintId]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [
      new URL(`https://edarxiv.org/${id}`),
      { type: 'edarxiv', value: `10.35542/osf.io/${id}` as Doi<'35542'> },
    ])

export const engrxivPreprintId = (): fc.Arbitrary<EngrxivPreprintId> =>
  fc.record({
    type: fc.constant('engrxiv'),
    value: doi(fc.constant('31224')),
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
    type: fc.constant('medrxiv'),
    value: doi(fc.constant('1101')),
  })

export const medrxivPreprintUrl = (): fc.Arbitrary<[URL, MedrxivPreprintId]> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), { minLength: 1 })
    .filter(suffix => isDoi(`10.1101/${suffix}`))
    .map(suffix => [
      new URL(`https://www.medrxiv.org/content/10.1101/${suffix}`),
      { type: 'medrxiv', value: `10.1101/${suffix}` as Doi<'1101'> },
    ])

export const metaarxivPreprintId = (): fc.Arbitrary<MetaarxivPreprintId> =>
  fc.record({
    type: fc.constant('metaarxiv'),
    value: doi(fc.constant('31222')),
  })

export const metaarxivPreprintUrl = (): fc.Arbitrary<[URL, MetaarxivPreprintId]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/metaarxiv/${id}`),
      { type: 'metaarxiv', value: `10.31222/osf.io/${id}` as Doi<'31222'> },
    ])

export const osfPreprintId = (): fc.Arbitrary<OsfPreprintId> =>
  fc.record({
    type: fc.constant('osf'),
    value: doi(fc.constant('17605')),
  })

export const osfPreprintsPreprintId = (): fc.Arbitrary<OsfPreprintsPreprintId> =>
  fc.record({
    type: fc.constant('osf-preprints'),
    value: doi(fc.constant('31219')),
  })

export const osfPreprintsPreprintUrl = (): fc.Arbitrary<[URL, OsfPreprintsPreprintId]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/${id}`),
      { type: 'osf-preprints', value: `10.31219/osf.io/${id}` as Doi<'31219'> },
    ])

export const philsciPreprintId = (): fc.Arbitrary<PhilsciPreprintId> =>
  fc.record({
    type: fc.constant('philsci'),
    value: fc.integer({ min: 1 }),
  })

export const philsciPreprintUrl = (): fc.Arbitrary<[URL, PhilsciPreprintId]> =>
  philsciPreprintId().map(id => [new URL(`https://philsci-archive.pitt.edu/${id.value}/`), id])

export const preprintsorgPreprintId = (): fc.Arbitrary<PreprintsorgPreprintId> =>
  fc.record({
    type: fc.constant('preprints.org'),
    value: doi(fc.constant('20944')),
  })

export const preprintsorgPreprintUrl = (): fc.Arbitrary<[URL, PreprintsorgPreprintId]> =>
  fc
    .tuple(
      fc.stringOf(fc.oneof(alphanumeric(), fc.constant('.')), { minLength: 1 }).filter(id => !/^\.{1,2}$/.test(id)),
      fc.integer({ min: 1 }),
    )
    .map(([id, version]) => [
      new URL(`https://www.preprints.org/manuscript/${id}/v${version}`),
      { type: 'preprints.org', value: `10.20944/preprints${id}.v${version}` as Doi<'20944'> },
    ])

export const psyarxivPreprintId = (): fc.Arbitrary<PsyarxivPreprintId> =>
  fc.record({
    type: fc.constant('psyarxiv'),
    value: doi(fc.constant('31234')),
  })

export const psyarxivPreprintUrl = (): fc.Arbitrary<[URL, PsyarxivPreprintId]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [
      new URL(`https://psyarxiv.com/${id}`),
      { type: 'psyarxiv', value: `10.31234/osf.io/${id}` as Doi<'31234'> },
    ])

export const researchSquarePreprintId = (): fc.Arbitrary<ResearchSquarePreprintId> =>
  fc.record({
    type: fc.constant('research-square'),
    value: doi(fc.constant('21203')),
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
    type: fc.constant('scielo'),
    value: doi(fc.constant('1590')),
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
    type: fc.constant('science-open'),
    value: doi(fc.constant('14293')),
  })

export const scienceOpenPreprintUrl = (): fc.Arbitrary<[URL, ScienceOpenPreprintId]> =>
  scienceOpenPreprintId().map(({ value }) => [
    new URL(`https://www.scienceopen.com/hosted-document?doi=${encodeURIComponent(value)}`),
    { type: 'science-open', value },
  ])

export const socarxivPreprintId = (): fc.Arbitrary<SocarxivPreprintId> =>
  fc.record({
    type: fc.constant('socarxiv'),
    value: doi(fc.constant('31235')),
  })

export const socarxivPreprintUrl = (): fc.Arbitrary<[URL, SocarxivPreprintId]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/socarxiv/${id}`),
      { type: 'socarxiv', value: `10.31235/osf.io/${id}` as Doi<'31235'> },
    ])

export const zenodoPreprintId = (): fc.Arbitrary<ZenodoPreprintId> =>
  fc.record({
    type: fc.constant('zenodo'),
    value: doi(fc.constant('5281')),
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
    type: fc.constant('biorxiv-medrxiv'),
    value: doi(fc.constant('1101')),
  })

export const zenodoOrAfricarxivPreprintId = (): fc.Arbitrary<ZenodoOrAfricarxivPreprintId> =>
  fc.record({
    type: fc.constant('zenodo-africarxiv'),
    value: doi(fc.constant('5281')),
  })

export const preprintId = (): fc.Arbitrary<PreprintId> => fc.oneof(philsciPreprintId(), preprintIdWithDoi())

export const preprintIdWithDoi = (): fc.Arbitrary<Extract<PreprintId, { value: Doi }>> =>
  fc.oneof(
    africarxivPreprintId(),
    arxivPreprintId(),
    authoreaPreprintId(),
    biorxivPreprintId(),
    chemrxivPreprintId(),
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
    researchSquarePreprintId(),
    scieloPreprintId(),
    scienceOpenPreprintId(),
    socarxivPreprintId(),
    zenodoPreprintId(),
  )

export const indeterminatePreprintId = (): fc.Arbitrary<IndeterminatePreprintId> =>
  fc.oneof(preprintId(), biorxivOrMedrxivPreprintId(), zenodoOrAfricarxivPreprintId())

export const crossrefPreprintId = (): fc.Arbitrary<CrossrefPreprintId> =>
  fc.oneof(
    africarxivOsfPreprintId(),
    authoreaPreprintId(),
    biorxivPreprintId(),
    chemrxivPreprintId(),
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
  )

export const datacitePreprintId = (): fc.Arbitrary<DatacitePreprintId> =>
  fc.oneof(
    africarxivFigsharePreprintId(),
    africarxivZenodoPreprintId(),
    arxivPreprintId(),
    osfPreprintId(),
    zenodoPreprintId(),
  )

export const orcid = (): fc.Arbitrary<Orcid> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
      minLength: 4 + 4 + 4 + 3,
      maxLength: 4 + 4 + 4 + 3,
    })
    .map(value => mod11_2.generate(value).replace(/.{4}(?=.)/g, '$&-'))
    .filter(isOrcid)

export const careerStage = (): fc.Arbitrary<CareerStage> =>
  fc.record({ value: careerStageValue(), visibility: careerStageVisibility() })

export const careerStageValue = (): fc.Arbitrary<CareerStage['value']> => fc.constantFrom('early', 'mid', 'late')

export const careerStageVisibility = (): fc.Arbitrary<CareerStage['visibility']> =>
  fc.constantFrom('public', 'restricted')

export const languages = (): fc.Arbitrary<Languages> =>
  fc.record({ value: nonEmptyString(), visibility: languagesVisibility() })

export const languagesVisibility = (): fc.Arbitrary<Languages['visibility']> => fc.constantFrom('public', 'restricted')

export const location = (): fc.Arbitrary<Location> =>
  fc.record({ value: nonEmptyString(), visibility: locationVisibility() })

export const locationVisibility = (): fc.Arbitrary<Location['visibility']> => fc.constantFrom('public', 'restricted')

export const researchInterests = (): fc.Arbitrary<ResearchInterests> =>
  fc.record({ value: nonEmptyString(), visibility: researchInterestsVisibility() })

export const researchInterestsVisibility = (): fc.Arbitrary<ResearchInterests['visibility']> =>
  fc.constantFrom('public', 'restricted')

export const isOpenForRequests = (): fc.Arbitrary<IsOpenForRequests> =>
  fc.oneof(
    fc.constant({ value: false as const }),
    fc.record({ value: fc.constant(true as const), visibility: isOpenForRequestsVisibility() }),
  )

export const isOpenForRequestsVisibility = (): fc.Arbitrary<
  Extract<IsOpenForRequests, { value: true }>['visibility']
> => fc.constantFrom('public', 'restricted')

export const slackUser = (): fc.Arbitrary<SlackUser> => fc.record({ name: fc.string(), image: url(), profile: url() })

export const slackUserId = (): fc.Arbitrary<SlackUserId> =>
  fc.record({ userId: nonEmptyString(), accessToken: nonEmptyString(), scopes: set(nonEmptyString()) })

export const clubId = (): fc.Arbitrary<ClubId> =>
  fc.constantFrom(
    'asapbio-cancer-biology',
    'asapbio-meta-research',
    'asapbio-metabolism',
    'asapbio-neurobiology',
    'biomass-biocatalysis',
    'biophysics-leipzig',
    'cara',
    'hhmi-training-pilot',
    'language-club',
    'open-science-community-iraqi',
    'rr-id-student-reviewer-club',
    'tsl-preprint-club',
  )

export const pseudonym = (): fc.Arbitrary<Pseudonym> =>
  fc
    .tuple(fc.constantFrom(...colors), fc.constantFrom(...animals))
    .map(parts => capitalCase(parts.join(' ')) as Pseudonym)

export const profileId = (): fc.Arbitrary<ProfileId> => fc.oneof(orcidProfileId(), pseudonymProfileId())

export const orcidProfileId = (): fc.Arbitrary<OrcidProfileId> =>
  fc.record({
    type: fc.constant('orcid'),
    value: orcid(),
  })

export const pseudonymProfileId = (): fc.Arbitrary<PseudonymProfileId> =>
  fc.record({
    type: fc.constant('pseudonym'),
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
  fc.constantFrom('CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE')

const headerName = () =>
  fc.stringOf(
    fc.char().filter(char => /^[\^_`a-zA-Z\-0-9!#$%&'*+.|~]$/.test(char)),
    { minLength: 1 },
  )

export const headers = () =>
  fc.option(fc.dictionary(headerName(), fc.string()), { nil: undefined }).map(init =>
    Object.defineProperties(new Headers(init), {
      [fc.toStringMethod]: { value: () => fc.stringify(init) },
    }),
  )

export const statusCode = (): fc.Arbitrary<Status> => fc.constantFrom(...Object.values(Status))

export const fetchResponse = ({ status }: { status?: fc.Arbitrary<number> } = {}): fc.Arbitrary<F.Response> =>
  fc
    .record({
      headers: headers(),
      status: status ?? fc.integer(),
      statusText: fc.string(),
      url: fc.string(),
      text: fc.string(),
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
      body: body ?? fc.constant(undefined),
      headers: headers ?? fc.constant({}),
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
): fc.Arbitrary<NonEmptyArray<T>> => fc.array(arb, { minLength: 1, ...constraints }).filter(isNonEmpty)

export const nonEmptyString = (): fc.Arbitrary<NonEmptyString> => fc.string({ minLength: 1 }).filter(isNonEmptyString)

export const languageCode = (): fc.Arbitrary<LanguageCode> => fc.constantFrom(...ISO6391.getAllCodes())

export const user = (): fc.Arbitrary<User> =>
  fc.record({
    name: fc.string(),
    orcid: orcid(),
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

export const preprintTitle = (): fc.Arbitrary<PreprintTitle> =>
  fc.record({
    id: preprintId(),
    language: languageCode(),
    title: html(),
  })

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
