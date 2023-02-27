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
  | PsyarxivPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId
  | ScienceOpenPreprintId
  | SocarxivPreprintId

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

export const isPreprintDoi: Refinement<Doi, PreprintId['doi']> = hasRegistrant(
  '1101',
  '1590',
  '14293',
  '21203',
  '26434',
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

export const PreprintDoiD: D.Decoder<unknown, PreprintId['doi']> = D.fromRefinement(
  pipe(isDoi, compose(isPreprintDoi)),
  'DOI',
)

export const parsePreprintDoi: (input: string) => O.Option<PreprintId['doi']> = flow(parse, O.filter(isPreprintDoi))

export function fromUrl(url: URL): O.Option<PreprintId['doi']> {
  return match([url.hostname, url.pathname.slice(1)])
    .with([P.union('doi.org', 'dx.doi.org'), P.select()], extractFromDoiPath)
    .with([P.union('arxiv.org', 'www.arxiv.org'), P.select()], extractFromArxivPath)
    .with(
      [P.union('biorxiv.org', 'www.biorxiv.org', 'medrxiv.org', 'www.medrxiv.org'), P.select()],
      extractFromBiorxivMedrxivPath,
    )
    .with([P.union('edarxiv.org', 'www.edarxiv.org'), P.select()], extractFromEdarxivPath)
    .with([P.union('engrxiv.org', 'www.engrxiv.org'), P.select()], extractFromEngrxivPath)
    .with([P.union('osf.io', 'www.osf.io'), P.select()], extractFromOsfPath)
    .with([P.union('psyarxiv.com', 'www.psyarxiv.com'), P.select()], extractFromPsyarxivPath)
    .with(
      [P.union('researchsquare.com', 'www.researchsquare.com', 'assets.researchsquare.com'), P.select()],
      extractFromResearchSquarePath,
    )
    .with(['preprints.scielo.org', P.select()], extractFromScieloPath)
    .with([P.union('scienceopen.com', 'www.scienceopen.com'), 'hosted-document'], () =>
      extractFromScienceOpenQueryString(url.searchParams),
    )
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
      .with('africarxiv', () => `10.31730/osf.io/${id}` as const)
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
