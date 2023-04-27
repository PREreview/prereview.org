import { Doi, hasRegistrant, isDoi, parse } from 'doi-ts'
import * as O from 'fp-ts/Option'
import { Refinement, compose } from 'fp-ts/Refinement'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'

export type PreprintId =
  | AfricarxivPreprintId
  | ArxivPreprintId
  | BiorxivPreprintId
  | ChemrxivPreprintId
  | EartharxivPreprintId
  | EcoevorxivPreprintId
  | EdarxivPreprintId
  | EngrxivPreprintId
  | MedrxivPreprintId
  | MetaarxivPreprintId
  | OsfPreprintId
  | PreprintsorgPreprintId
  | PsyarxivPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId
  | ScienceOpenPreprintId
  | SocarxivPreprintId

export type IndeterminatePreprintId = PreprintId | BiorxivOrMedrxivPreprintId

export interface AfricarxivPreprintId {
  readonly type: 'africarxiv'
  readonly doi: Doi<'31730'>
}

export interface ArxivPreprintId {
  readonly type: 'arxiv'
  readonly doi: Doi<'48550'>
}

export interface BiorxivPreprintId {
  readonly type: 'biorxiv'
  readonly doi: Doi<'1101'>
}

export interface ChemrxivPreprintId {
  readonly type: 'chemrxiv'
  readonly doi: Doi<'26434'>
}

export interface EartharxivPreprintId {
  readonly type: 'eartharxiv'
  readonly doi: Doi<'31223'>
}

export interface EcoevorxivPreprintId {
  readonly type: 'ecoevorxiv'
  readonly doi: Doi<'32942'>
}

export interface EdarxivPreprintId {
  readonly type: 'edarxiv'
  readonly doi: Doi<'35542'>
}

export interface EngrxivPreprintId {
  readonly type: 'engrxiv'
  readonly doi: Doi<'31224'>
}

export interface MedrxivPreprintId {
  readonly type: 'medrxiv'
  readonly doi: Doi<'1101'>
}

export interface MetaarxivPreprintId {
  readonly type: 'metaarxiv'
  readonly doi: Doi<'31222'>
}

export interface OsfPreprintId {
  readonly type: 'osf'
  readonly doi: Doi<'31219'>
}

export interface PreprintsorgPreprintId {
  readonly type: 'preprints.org'
  readonly doi: Doi<'20944'>
}

export interface PsyarxivPreprintId {
  readonly type: 'psyarxiv'
  readonly doi: Doi<'31234'>
}

export interface ResearchSquarePreprintId {
  readonly type: 'research-square'
  readonly doi: Doi<'21203'>
}

export interface ScieloPreprintId {
  readonly type: 'scielo'
  readonly doi: Doi<'1590'>
}

export interface ScienceOpenPreprintId {
  readonly type: 'science-open'
  readonly doi: Doi<'14293'>
}

export interface SocarxivPreprintId {
  readonly type: 'socarxiv'
  readonly doi: Doi<'31235'>
}

export interface BiorxivOrMedrxivPreprintId {
  readonly type: 'biorxiv-medrxiv'
  readonly doi: BiorxivPreprintId['doi'] | MedrxivPreprintId['doi']
}

export const isPreprintDoi: Refinement<Doi, IndeterminatePreprintId['doi']> = hasRegistrant(
  '1101',
  '1590',
  '14293',
  '21203',
  '26434',
  '20944',
  '31219',
  '31222',
  '31223',
  '31224',
  '31234',
  '31235',
  '31730',
  '32942',
  '35542',
  '48550',
)

export const PreprintDoiD: D.Decoder<unknown, IndeterminatePreprintId['doi']> = D.fromRefinement(
  pipe(isDoi, compose(isPreprintDoi)),
  'DOI',
)

export const parsePreprintDoi: (input: string) => O.Option<IndeterminatePreprintId> = flow(
  parse,
  O.filter(isPreprintDoi),
  O.map(fromPreprintDoi),
)

export function fromPreprintDoi(doi: IndeterminatePreprintId['doi']): IndeterminatePreprintId {
  return match(doi)
    .when(hasRegistrant('1101'), doi => ({ type: 'biorxiv-medrxiv', doi } satisfies BiorxivOrMedrxivPreprintId))
    .when(hasRegistrant('1590'), doi => ({ type: 'scielo', doi } satisfies ScieloPreprintId))
    .when(hasRegistrant('14293'), doi => ({ type: 'science-open', doi } satisfies ScienceOpenPreprintId))
    .when(hasRegistrant('21203'), doi => ({ type: 'research-square', doi } satisfies ResearchSquarePreprintId))
    .when(hasRegistrant('26434'), doi => ({ type: 'chemrxiv', doi } satisfies ChemrxivPreprintId))
    .when(hasRegistrant('20944'), doi => ({ type: 'preprints.org', doi } satisfies PreprintsorgPreprintId))
    .when(hasRegistrant('31219'), doi => ({ type: 'osf', doi } satisfies OsfPreprintId))
    .when(hasRegistrant('31222'), doi => ({ type: 'metaarxiv', doi } satisfies MetaarxivPreprintId))
    .when(hasRegistrant('31223'), doi => ({ type: 'eartharxiv', doi } satisfies EartharxivPreprintId))
    .when(hasRegistrant('31224'), doi => ({ type: 'engrxiv', doi } satisfies EngrxivPreprintId))
    .when(hasRegistrant('31234'), doi => ({ type: 'psyarxiv', doi } satisfies PsyarxivPreprintId))
    .when(hasRegistrant('31235'), doi => ({ type: 'socarxiv', doi } satisfies SocarxivPreprintId))
    .when(hasRegistrant('31730'), doi => ({ type: 'africarxiv', doi } satisfies AfricarxivPreprintId))
    .when(hasRegistrant('32942'), doi => ({ type: 'ecoevorxiv', doi } satisfies EcoevorxivPreprintId))
    .when(hasRegistrant('35542'), doi => ({ type: 'edarxiv', doi } satisfies EdarxivPreprintId))
    .when(hasRegistrant('48550'), doi => ({ type: 'arxiv', doi } satisfies ArxivPreprintId))
    .exhaustive()
}

export function fromUrl(url: URL): O.Option<IndeterminatePreprintId> {
  return match([url.hostname.replace('www.', ''), url.pathname.slice(1)])
    .with([P.union('doi.org', 'dx.doi.org'), P.select()], extractFromDoiPath)
    .with(['arxiv.org', P.select()], extractFromArxivPath)
    .with(['biorxiv.org', P.select()], extractFromBiorxivMedrxivPath('biorxiv'))
    .with(['edarxiv.org', P.select()], extractFromEdarxivPath)
    .with(['engrxiv.org', P.select()], extractFromEngrxivPath)
    .with(['medrxiv.org', P.select()], extractFromBiorxivMedrxivPath('medrxiv'))
    .with(['osf.io', P.select()], extractFromOsfPath)
    .with(['preprints.org', P.select()], extractFromPreprintsorgPath)
    .with(['psyarxiv.com', P.select()], extractFromPsyarxivPath)
    .with([P.union('researchsquare.com', 'assets.researchsquare.com'), P.select()], extractFromResearchSquarePath)
    .with(['preprints.scielo.org', P.select()], extractFromScieloPath)
    .with(['scienceopen.com', 'hosted-document'], () => extractFromScienceOpenQueryString(url.searchParams))
    .otherwise(() => O.none)
}

const extractFromDoiPath = flow(decodeURIComponent, parsePreprintDoi)

const extractFromArxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/\/((?:[a-z]+-[a-z]{2}\/)?[0-9.]+)(?:v[1-9][0-9]*)?(?:\..*)?$/i)?.[1]),
  O.chain(flow(suffix => `10.48550/arXiv.${suffix}`, parsePreprintDoi)),
)

const extractFromBiorxivMedrxivPath = (type: 'biorxiv' | 'medrxiv') =>
  flow(
    decodeURIComponent,
    O.fromNullableK(s => s.match(/(?:^|\/)(?:content|lookup)\/.+\/([0-9.]+)(?:v[1-9][0-9]*)?(?:[./].*)?$/i)?.[1]),
    O.map(suffix => `10.1101/${suffix}`),
    O.filter(pipe(isDoi, compose(hasRegistrant('1101')))),
    O.map(doi => ({ type, doi } satisfies BiorxivPreprintId | MedrxivPreprintId)),
  )

const extractFromEdarxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^(?:preprints\/)?([a-z0-9]+)(?:\/?$|\/download)/i)?.[1]),
  O.chain(flow(id => `10.35542/osf.io/${id}`, parsePreprintDoi)),
)

const extractFromEngrxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^preprint\/[^/]+\/([1-9][0-9]*)(?:\/|$)/i)?.[1]),
  O.chain(flow(id => `10.31224/${id}`, parsePreprintDoi)),
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
  O.chain(parsePreprintDoi),
)

const extractFromPreprintsorgPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^manuscript\/([a-z0-9.]+)\/(v[1-9][0-9]*)(?:$|\/)/i)),
  O.chain(flow(([, id, version]) => `10.20944/preprints${id}.${version}`, parsePreprintDoi)),
)

const extractFromPsyarxivPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^(?:preprints\/)?([a-z0-9]+)(?:\/?$|\/download)/i)?.[1]),
  O.chain(flow(id => `10.31234/osf.io/${id}`, parsePreprintDoi)),
)

const extractFromResearchSquarePath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/\/(rs-[1-9][0-9]*\/v[1-9][0-9]*)(?:[./]|$)/)?.[1]),
  O.chain(flow(id => `10.21203/rs.3.${id}`, parsePreprintDoi)),
)

const extractFromScieloPath = flow(
  decodeURIComponent,
  O.fromNullableK(s => s.match(/^index\.php\/scielo\/preprint\/(?:view|download)\/([1-9][0-9]*)(?:\/|$)/)?.[1]),
  O.chain(flow(id => `10.1590/SciELOPreprints.${id}`, parsePreprintDoi)),
)

const extractFromScienceOpenQueryString = flow(
  O.fromNullableK((query: URLSearchParams) => query.get('doi')),
  O.chain(parsePreprintDoi),
)
