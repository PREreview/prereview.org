import { fc } from '@fast-check/jest'
import { Temporal } from '@js-temporal/polyfill'
import { mod11_2 } from 'cdigit'
import { Doi, isDoi } from 'doi-ts'
import { Request, Response } from 'express'
import * as F from 'fetch-fp-ts'
import { isNonEmpty } from 'fp-ts/Array'
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
  BiorxivPreprintId,
  ChemrxivPreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  OsfPreprintId,
  PreprintId,
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

export const preprintDoi = (): fc.Arbitrary<PreprintId['doi']> => preprintId().map(id => id.doi)

export const preprintUrl = (): fc.Arbitrary<[URL, PreprintId['doi']]> =>
  fc.oneof(
    africarxivPreprintUrl(),
    arxivPreprintUrl(),
    biorxivPreprintUrl(),
    edarxivPreprintUrl(),
    engrxivPreprintUrl(),
    medrxivPreprintUrl(),
    metaarxivPreprintUrl(),
    osfPreprintUrl(),
    psyarxivPreprintUrl(),
    researchSquarePreprintUrl(),
    scieloPreprintUrl(),
    scienceOpenPreprintUrl(),
    socarxivPreprintUrl(),
  )

export const crossrefPreprintDoi = (): fc.Arbitrary<CrossrefPreprintId['doi']> => crossrefPreprintId().map(id => id.doi)

export const datacitePreprintDoi = (): fc.Arbitrary<DatacitePreprintId['doi']> => datacitePreprintId().map(id => id.doi)

export const africarxivPreprintId = (): fc.Arbitrary<AfricarxivPreprintId> =>
  fc.record({
    type: fc.constant('africarxiv'),
    doi: doi(fc.constant('31730')),
  })

export const africarxivPreprintUrl = (): fc.Arbitrary<[URL, AfricarxivPreprintId['doi']]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [new URL(`https://osf.io/preprints/africarxiv/${id}`), `10.31730/osf.io/${id}` as Doi<'31730'>])

export const arxivPreprintId = (): fc.Arbitrary<ArxivPreprintId> =>
  fc.record({
    type: fc.constant('arxiv'),
    doi: doi(fc.constant('48550')),
  })

export const arxivPreprintUrl = (): fc.Arbitrary<[URL, ArxivPreprintId['doi']]> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), { minLength: 1 })
    .filter(suffix => isDoi(`10.48550/${suffix}`))
    .map(suffix => [new URL(`https://arxiv.org/abs/${suffix}`), `10.48550/arXiv.${suffix}` as Doi<'48550'>])

export const biorxivPreprintId = (): fc.Arbitrary<BiorxivPreprintId> =>
  fc.record({
    type: fc.constant('biorxiv'),
    doi: doi(fc.constant('1101')),
  })

export const biorxivPreprintUrl = (): fc.Arbitrary<[URL, BiorxivPreprintId['doi']]> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), { minLength: 1 })
    .filter(suffix => isDoi(`10.1101/${suffix}`))
    .map(suffix => [new URL(`https://www.biorxiv.org/content/10.1101/${suffix}`), `10.1101/${suffix}` as Doi<'1101'>])

export const chemrxivPreprintId = (): fc.Arbitrary<ChemrxivPreprintId> =>
  fc.record({
    type: fc.constant('chemrxiv'),
    doi: doi(fc.constant('26434')),
  })

export const chemrxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => new URL(`https://chemrxiv.org/engage/chemrxiv/article-details/${id}`))

export const eartharxivPreprintId = (): fc.Arbitrary<EartharxivPreprintId> =>
  fc.record({
    type: fc.constant('eartharxiv'),
    doi: doi(fc.constant('31223')),
  })

export const eartharxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.integer({ min: 1 }).map(id => new URL(`https://eartharxiv.org/repository/view/${id}/`))

export const ecoevorxivPreprintId = (): fc.Arbitrary<EcoevorxivPreprintId> =>
  fc.record({
    type: fc.constant('ecoevorxiv'),
    doi: doi(fc.constant('32942')),
  })

export const ecoevorxivPreprintUrl = (): fc.Arbitrary<URL> =>
  fc.integer({ min: 1 }).map(id => new URL(`https://ecoevorxiv.org/repository/view/${id}/`))

export const edarxivPreprintId = (): fc.Arbitrary<EdarxivPreprintId> =>
  fc.record({
    type: fc.constant('edarxiv'),
    doi: doi(fc.constant('35542')),
  })

export const edarxivPreprintUrl = (): fc.Arbitrary<[URL, EdarxivPreprintId['doi']]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [new URL(`https://edarxiv.org/${id}`), `10.35542/osf.io/${id}` as Doi<'35542'>])

export const engrxivPreprintId = (): fc.Arbitrary<EngrxivPreprintId> =>
  fc.record({
    type: fc.constant('engrxiv'),
    doi: doi(fc.constant('31224')),
  })

export const engrxivPreprintUrl = (): fc.Arbitrary<[URL, EngrxivPreprintId['doi']]> =>
  fc
    .integer({ min: 1 })
    .map(id => [new URL(`https://engrxiv.org/preprint/view/${id}`), `10.31224/${id}` as Doi<'31224'>])

export const medrxivPreprintId = (): fc.Arbitrary<MedrxivPreprintId> =>
  fc.record({
    type: fc.constant('medrxiv'),
    doi: doi(fc.constant('1101')),
  })

export const medrxivPreprintUrl = (): fc.Arbitrary<[URL, MedrxivPreprintId['doi']]> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), { minLength: 1 })
    .filter(suffix => isDoi(`10.1101/${suffix}`))
    .map(suffix => [new URL(`https://www.medrxiv.org/content/10.1101/${suffix}`), `10.1101/${suffix}` as Doi<'1101'>])

export const metaarxivPreprintId = (): fc.Arbitrary<MetaarxivPreprintId> =>
  fc.record({
    type: fc.constant('metaarxiv'),
    doi: doi(fc.constant('31222')),
  })

export const metaarxivPreprintUrl = (): fc.Arbitrary<[URL, MetaarxivPreprintId['doi']]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [new URL(`https://osf.io/preprints/metaarxiv/${id}`), `10.31222/osf.io/${id}` as Doi<'31222'>])

export const osfPreprintId = (): fc.Arbitrary<OsfPreprintId> =>
  fc.record({
    type: fc.constant('osf'),
    doi: doi(fc.constant('31219')),
  })

export const osfPreprintUrl = (): fc.Arbitrary<[URL, OsfPreprintId['doi']]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [new URL(`https://osf.io/${id}`), `10.31219/osf.io/${id}` as Doi<'31219'>])

export const psyarxivPreprintId = (): fc.Arbitrary<PsyarxivPreprintId> =>
  fc.record({
    type: fc.constant('psyarxiv'),
    doi: doi(fc.constant('31234')),
  })

export const psyarxivPreprintUrl = (): fc.Arbitrary<[URL, PsyarxivPreprintId['doi']]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [new URL(`https://psyarxiv.com/${id}`), `10.31234/osf.io/${id}` as Doi<'31234'>])

export const researchSquarePreprintId = (): fc.Arbitrary<ResearchSquarePreprintId> =>
  fc.record({
    type: fc.constant('research-square'),
    doi: doi(fc.constant('21203')),
  })

export const researchSquarePreprintUrl = (): fc.Arbitrary<[URL, ResearchSquarePreprintId['doi']]> =>
  fc
    .tuple(fc.integer({ min: 1 }), fc.integer({ min: 1 }))
    .map(([id, version]) => [
      new URL(`https://www.researchsquare.com/article/rs-${id}/v${version}`),
      `10.21203/rs.3.rs-${id}/v${version}` as Doi<'21203'>,
    ])

export const scieloPreprintId = (): fc.Arbitrary<ScieloPreprintId> =>
  fc.record({
    type: fc.constant('scielo'),
    doi: doi(fc.constant('1590')),
  })

export const scieloPreprintUrl = (): fc.Arbitrary<[URL, ScieloPreprintId['doi']]> =>
  fc
    .integer({ min: 1 })
    .map(id => [
      new URL(`https://preprints.scielo.org/index.php/scielo/preprint/view/${id}`),
      `10.1590/SciELOPreprints.${id}` as Doi<'1590'>,
    ])

export const scienceOpenPreprintId = (): fc.Arbitrary<ScienceOpenPreprintId> =>
  fc.record({
    type: fc.constant('science-open'),
    doi: doi(fc.constant('14293')),
  })

export const scienceOpenPreprintUrl = (): fc.Arbitrary<[URL, ScienceOpenPreprintId['doi']]> =>
  scienceOpenPreprintId().map(({ doi }) => [
    new URL(`https://www.scienceopen.com/hosted-document?doi=${encodeURIComponent(doi)}`),
    doi,
  ])

export const socarxivPreprintId = (): fc.Arbitrary<SocarxivPreprintId> =>
  fc.record({
    type: fc.constant('socarxiv'),
    doi: doi(fc.constant('31235')),
  })

export const socarxivPreprintUrl = (): fc.Arbitrary<[URL, SocarxivPreprintId['doi']]> =>
  fc
    .stringOf(alphanumeric(), { minLength: 1 })
    .map(id => [new URL(`https://osf.io/preprints/socarxiv/${id}`), `10.31235/osf.io/${id}` as Doi<'31235'>])

export const preprintId = (): fc.Arbitrary<PreprintId> =>
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
    psyarxivPreprintId(),
    researchSquarePreprintId(),
    scieloPreprintId(),
    scienceOpenPreprintId(),
    socarxivPreprintId(),
  )

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
