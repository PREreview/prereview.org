import { Doi, hasRegistrant, isDoi, parse } from 'doi-ts'
import * as O from 'fp-ts/Option'
import { Refinement, compose } from 'fp-ts/Refinement'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { preprintId } from '../test/fc'

const preprintRegistrants = [
  {
    type: 'africarxiv' as const,
    prefix: '31730' as const,
  },
  {
    type: 'arxiv' as const,
    prefix: '48550' as const,
  },
  {
    type: 'biorxiv' as const,
    prefix: '1101' as const,
  },
  {
    type: 'chemrxiv' as const,
    prefix: '26434' as const,
  },
  {
    type: 'eartharxiv' as const,
    prefix: '31223' as const,
  },
  {
    type: 'ecoevorxiv' as const,
    prefix: '32942' as const,
  },
  {
    type: 'edarxiv' as const,
    prefix: '35542' as const,
  },
  {
    type: 'engrxiv' as const,
    prefix: '31224' as const,
  },
  {
    type: 'medrxiv' as const,
    prefix: '1101' as const,
  },
  {
    type: 'metaarxiv' as const,
    prefix: '31222' as const,
  },
  {
    type: 'osf' as const,
    prefix: '31219' as const,
  },
  {
    type: 'psyarxiv' as const,
    prefix: '31234' as const,
  },
  {
    type: 'research-square' as const,
    prefix: '21203' as const,
  },
  {
    type: 'scielo' as const,
    prefix: '1590' as const,
  },
  {
    type: 'science-open' as const,
    prefix: '14293' as const,
  },
  {
    type: 'socarxiv' as const,
    prefix: '31235' as const,
  },
]

type Registrant = {
  type: string
  prefix: string
}

type ToPreprintId<R extends Registrant> = {
  type: R['type']
  doi: Doi<R['prefix']>
}

type PreprintRegistrant = (typeof preprintRegistrants)[number]

type MapToPreprintId<T extends PreprintRegistrant> = T extends PreprintRegistrant ? ToPreprintId<T> : never

export type PreprintId = MapToPreprintId<PreprintRegistrant>

export type PreprintIdByType<T extends PreprintId['type']> = PreprintId & { type: T }

export type AfricarxivPreprintId = PreprintIdByType<'africarxiv'>
export type ArxivPreprintId = PreprintIdByType<'arxiv'>
export type BiorxivPreprintId = PreprintIdByType<'biorxiv'>
export type ChemrxivPreprintId = PreprintIdByType<'chemrxiv'>
export type EartharxivPreprintId = PreprintIdByType<'eartharxiv'>
export type EcoevorxivPreprintId = PreprintIdByType<'ecoevorxiv'>
export type EdarxivPreprintId = PreprintIdByType<'edarxiv'>
export type EngrxivPreprintId = PreprintIdByType<'engrxiv'>
export type MedrxivPreprintId = PreprintIdByType<'medrxiv'>
export type MetaarxivPreprintId = PreprintIdByType<'metaarxiv'>
export type OsfPreprintId = PreprintIdByType<'osf'>
export type PsyarxivPreprintId = PreprintIdByType<'psyarxiv'>
export type ResearchSquarePreprintId = PreprintIdByType<'research-square'>
export type ScieloPreprintId = PreprintIdByType<'scielo'>
export type ScienceOpenPreprintId = PreprintIdByType<'science-open'>
export type SocarxivPreprintId = PreprintIdByType<'socarxiv'>

export const isPreprintDoi: Refinement<Doi, PreprintId['doi']> = hasRegistrant(
  ...preprintRegistrants.map(r => r.prefix),
)

export const PreprintDoiD: D.Decoder<unknown, PreprintId['doi']> = D.fromRefinement(
  pipe(isDoi, compose(isPreprintDoi)),
  'DOI',
)

export const parsePreprintDoi: (input: string) => O.Option<PreprintId['doi']> = flow(parse, O.filter(isPreprintDoi))

export function fromUrl(url: URL): O.Option<PreprintId['doi']> {
  return match([url.hostname.replace('www.', ''), url.pathname.slice(1)])
    .with([P.union('doi.org', 'dx.doi.org'), P.select()], extractFromDoiPath)
    .with(['arxiv.org', P.select()], extractFromArxivPath)
    .with([P.union('biorxiv.org', 'medrxiv.org'), P.select()], extractFromBiorxivMedrxivPath)
    .with(['edarxiv.org', P.select()], extractFromEdarxivPath)
    .with(['engrxiv.org', P.select()], extractFromEngrxivPath)
    .with(['osf.io', P.select()], extractFromOsfPath)
    .with(['psyarxiv.com', P.select()], extractFromPsyarxivPath)
    .with([P.union('researchsquare.com', 'assets.researchsquare.com'), P.select()], extractFromResearchSquarePath)
    .with(['preprints.scielo.org', P.select()], extractFromScieloPath)
    .with(['scienceopen.com', 'hosted-document'], () => extractFromScienceOpenQueryString(url.searchParams))
    .otherwise(() => O.none)
}

const extractFromDoiPath = flow(decodeURIComponent, O.fromPredicate(isDoi), O.filter(isPreprintDoi))

const extractFromArxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/\/((?:[a-z]+-[a-z]{2}\/)?[0-9.]+)(?:v[1-9][0-9]*)?(?:\..*)?$/i)?.[1]),
  O.map(suffix => `10.48550/arXiv.${suffix}`),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)

const extractFromBiorxivMedrxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/(?:^|\/)(?:content|lookup)\/.+\/([0-9.]+)(?:v[1-9][0-9]*)?(?:[./].*)?$/i)?.[1]),
  O.map(suffix => `10.1101/${suffix}`),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)

const extractFromEdarxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^(?:preprints\/)?([a-z0-9]+)(?:\/?$|\/download)/i)?.[1]),
  O.map(id => `10.35542/osf.io/${id}`),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)

const extractFromEngrxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^preprint\/[^/]+\/([1-9][0-9]*)(?:\/|$)/i)?.[1]),
  O.map(id => `10.31224/${id}`),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)

const extractFromOsfPath = flow(
  decodeURIComponent,
  O.fromNullableK(s =>
    s.match(/^(?:preprints\/(?:(africarxiv|metaarxiv|socarxiv)\/)?)?([a-z0-9]+)(?:\/?$|\/download)/i),
  ),
  O.map(([, prefix, id]) =>
    match(prefix)
      .with('africarxiv', () => `10.31730/osf.io/${id}`)
      .with('metaarxiv', () => `10.31222/osf.io/${id}`)
      .with('socarxiv', () => `10.31235/osf.io/${id}`)
      .otherwise(() => `10.31219/osf.io/${id}`),
  ),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)

const extractFromPsyarxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^(?:preprints\/)?([a-z0-9]+)(?:\/?$|\/download)/i)?.[1]),
  O.map(id => `10.31234/osf.io/${id}`),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)

const extractFromResearchSquarePath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/\/(rs-[1-9][0-9]*\/v[1-9][0-9]*)(?:[./]|$)/)?.[1]),
  O.map(id => `10.21203/rs.3.${id}`),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)

const extractFromScieloPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^index\.php\/scielo\/preprint\/(?:view|download)\/([1-9][0-9]*)(?:\/|$)/)?.[1]),
  O.map(id => `10.1590/SciELOPreprints.${id}`),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)

const extractFromScienceOpenQueryString = flow(
  O.fromNullableK((query: URLSearchParams) => query.get('doi')),
  O.filter(pipe(isDoi, compose(isPreprintDoi))),
)
