import { fc } from '@fast-check/jest'
import { Temporal } from '@js-temporal/polyfill'
import { mod11_2 } from 'cdigit'
import { Doi, isDoi } from 'doi-ts'
import { Request, Response } from 'express'
import * as F from 'fetch-fp-ts'
import { isNonEmpty } from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { Json, JsonRecord } from 'fp-ts/Json'
import { NonEmptyArray } from 'fp-ts/NonEmptyArray'
import { Refinement } from 'fp-ts/Refinement'
import * as H from 'hyper-ts'
import { ExpressConnection } from 'hyper-ts/lib/express'
import ISO6391, { LanguageCode } from 'iso-639-1'
import { Headers as FetchHeaders } from 'node-fetch'
import { Body, Headers, RequestMethod, createRequest, createResponse } from 'node-mocks-http'
import { Orcid, isOrcid } from 'orcid-id-ts'
import { Uuid, isUuid } from 'uuid-ts'
import { CrossrefPreprintId } from '../src/crossref'
import { DatacitePreprintId } from '../src/datacite'
import { Html, sanitizeHtml, html as toHtml } from '../src/html'
import { Preprint } from '../src/preprint'
import {
  AfricarxivPreprintId,
  ArxivPreprintId,
  BiorxivOrMedrxivPreprintId,
  BiorxivPreprintId,
  ChemrxivPreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  IndeterminatePreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  OsfPreprintId,
  PhilsciPreprintId,
  PreprintId,
  PreprintsorgPreprintId,
  PsyarxivPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  ScienceOpenPreprintId,
  SocarxivPreprintId,
} from '../src/preprint-id'
import { NonEmptyString, isNonEmptyString } from '../src/string'
import { User } from '../src/user'

export type Arbitrary<T> = fc.Arbitrary<T>

export const {
  anything,
  array,
  boolean,
  constant,
  constantFrom,
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

export const uuid = (): fc.Arbitrary<Uuid> => fc.uuid().filter(isUuid)

export const error = (): fc.Arbitrary<Error> => fc.string().map(error => new Error(error))

export const cookieName = (): fc.Arbitrary<string> => fc.lorem({ maxCount: 1 })

export const html = (): fc.Arbitrary<Html> => fc.lorem().map(text => toHtml`<p>${text}</p>`)

export const sanitisedHtml = (): fc.Arbitrary<Html> => fc.string().map(sanitizeHtml)

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

export const preprintDoi = (): fc.Arbitrary<Extract<PreprintId, { value: Doi }>['value']> =>
  preprintIdWithDoi().map(id => id.value)

export const supportedPreprintUrl = (): fc.Arbitrary<[URL, PreprintId]> =>
  fc.oneof(
    africarxivPreprintUrl(),
    arxivPreprintUrl(),
    biorxivPreprintUrl(),
    edarxivPreprintUrl(),
    engrxivPreprintUrl(),
    medrxivPreprintUrl(),
    metaarxivPreprintUrl(),
    osfPreprintUrl(),
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
  fc.record({
    type: fc.constant('africarxiv'),
    value: doi(fc.constant('31730')),
  })

export const africarxivPreprintUrl = (): fc.Arbitrary<[URL, AfricarxivPreprintId]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [
      new URL(`https://osf.io/preprints/africarxiv/${id}`),
      { type: 'africarxiv', value: `10.31730/osf.io/${id}` as Doi<'31730'> },
    ])

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
    value: doi(fc.constant('31219')),
  })

export const osfPreprintUrl = (): fc.Arbitrary<[URL, OsfPreprintId]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [new URL(`https://osf.io/${id}`), { type: 'osf', value: `10.31219/osf.io/${id}` as Doi<'31219'> }])

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

export const biorxivOrMedrxivPreprintId = (): fc.Arbitrary<BiorxivOrMedrxivPreprintId> =>
  fc.record({
    type: fc.constant('biorxiv-medrxiv'),
    value: doi(fc.constant('1101')),
  })

export const preprintId = (): fc.Arbitrary<PreprintId> => fc.oneof(philsciPreprintId(), preprintIdWithDoi())

export const preprintIdWithDoi = (): fc.Arbitrary<Extract<PreprintId, { value: Doi }>> =>
  fc.oneof(
    africarxivPreprintId(),
    arxivPreprintId(),
    biorxivPreprintId(),
    chemrxivPreprintId(),
    eartharxivPreprintId(),
    ecoevorxivPreprintId(),
    edarxivPreprintId(),
    engrxivPreprintId(),
    medrxivPreprintId(),
    metaarxivPreprintId(),
    osfPreprintId(),
    preprintsorgPreprintId(),
    psyarxivPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    scienceOpenPreprintId(),
    socarxivPreprintId(),
  )

export const indeterminatePreprintId = (): fc.Arbitrary<IndeterminatePreprintId> =>
  fc.oneof(preprintId(), biorxivOrMedrxivPreprintId())

export const crossrefPreprintId = (): fc.Arbitrary<CrossrefPreprintId> =>
  fc.oneof(
    africarxivPreprintId(),
    biorxivPreprintId(),
    chemrxivPreprintId(),
    eartharxivPreprintId(),
    ecoevorxivPreprintId(),
    edarxivPreprintId(),
    engrxivPreprintId(),
    medrxivPreprintId(),
    metaarxivPreprintId(),
    osfPreprintId(),
    preprintsorgPreprintId(),
    psyarxivPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    scienceOpenPreprintId(),
    socarxivPreprintId(),
  )

export const datacitePreprintId = (): fc.Arbitrary<DatacitePreprintId> => arxivPreprintId()

export const orcid = (): fc.Arbitrary<Orcid> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
      minLength: 4 + 4 + 4 + 3,
      maxLength: 4 + 4 + 4 + 3,
    })
    .map(value => mod11_2.generate(value).replace(/.{4}(?=.)/g, '$&-'))
    .filter(isOrcid)

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
  fc.option(fc.dictionary(headerName(), fc.string()), { nil: undefined }).map(init => new FetchHeaders(init))

export const fetchResponse = ({ status }: { status?: fc.Arbitrary<number> } = {}): fc.Arbitrary<F.Response> =>
  fc.record({
    headers: headers(),
    status: status ?? fc.integer(),
    statusText: fc.string(),
    url: fc.string(),
    clone: fc.func(fc.constant(undefined)) as unknown as fc.Arbitrary<F.Response['clone']>,
    text: fc.func(fc.string().map(text => Promise.resolve(text))),
  })

export const request = ({
  body,
  headers,
  method,
}: {
  body?: fc.Arbitrary<Body>
  headers?: fc.Arbitrary<Headers>
  method?: fc.Arbitrary<RequestMethod>
} = {}): fc.Arbitrary<Request> =>
  fc
    .record({
      body: body ?? fc.constant(undefined),
      headers: headers ?? fc.constant({}),
      method: method ?? requestMethod(),
      url: fc.webUrl(),
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
    pseudonym: fc.string(),
  })

export const preprint = (): fc.Arbitrary<Preprint> =>
  fc.record(
    {
      abstract: fc.record({
        language: languageCode(),
        text: html(),
      }),
      authors: nonEmptyArray(
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
