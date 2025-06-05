import { Url, UrlParams } from '@effect/platform'
import { type Doi, Eq as eqDoi, hasRegistrant, isDoi, parse } from 'doi-ts'
import { Array, Data, Either, type Equivalence, Option, Predicate, flow, pipe } from 'effect'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import * as FptsToEffect from '../FptsToEffect.js'

export type PreprintId =
  | AdvancePreprintId
  | AfricarxivPreprintId
  | ArcadiaSciencePreprintId
  | ArxivPreprintId
  | AuthoreaPreprintId
  | BiorxivPreprintId
  | ChemrxivPreprintId
  | CurvenotePreprintId
  | EartharxivPreprintId
  | EcoevorxivPreprintId
  | EdarxivPreprintId
  | EngrxivPreprintId
  | JxivPreprintId
  | LifecycleJournalPreprintId
  | MedrxivPreprintId
  | MetaarxivPreprintId
  | NeurolibrePreprintId
  | OsfPreprintId
  | OsfPreprintsPreprintId
  | PhilsciPreprintId
  | PreprintsorgPreprintId
  | PsyarxivPreprintId
  | PsychArchivesPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId
  | ScienceOpenPreprintId
  | SocarxivPreprintId
  | SsrnPreprintId
  | TechrxivPreprintId
  | VerixivPreprintId
  | ZenodoPreprintId

export type IndeterminatePreprintId =
  | PreprintId
  | BiorxivOrMedrxivPreprintId
  | OsfOrLifecycleJournalPreprintId
  | ZenodoOrAfricarxivPreprintId

export interface AdvancePreprintId {
  readonly _tag: 'advance'
  readonly value: Doi<'31124'>
}

export type AfricarxivPreprintId =
  | AfricarxivFigsharePreprintId
  | AfricarxivOsfPreprintId
  | AfricarxivUbuntunetPreprintId
  | AfricarxivZenodoPreprintId

export interface AfricarxivFigsharePreprintId {
  readonly _tag: 'africarxiv'
  readonly value: Doi<'6084'>
}

export interface AfricarxivOsfPreprintId {
  readonly _tag: 'africarxiv'
  readonly value: Doi<'31730'>
}

export interface AfricarxivUbuntunetPreprintId {
  readonly _tag: 'africarxiv'
  readonly value: Doi<'60763'>
}

export interface AfricarxivZenodoPreprintId {
  readonly _tag: 'africarxiv'
  readonly value: Doi<'5281'>
}

export interface ArcadiaSciencePreprintId {
  readonly _tag: 'arcadia-science'
  readonly value: Doi<'57844'>
}

export interface ArxivPreprintId {
  readonly _tag: 'arxiv'
  readonly value: Doi<'48550'>
}

export interface AuthoreaPreprintId {
  readonly _tag: 'authorea'
  readonly value: Doi<'22541'>
}

export interface BiorxivPreprintId {
  readonly _tag: 'biorxiv'
  readonly value: Doi<'1101'>
}

export interface ChemrxivPreprintId {
  readonly _tag: 'chemrxiv'
  readonly value: Doi<'26434'>
}

export interface CurvenotePreprintId {
  readonly _tag: 'curvenote'
  readonly value: Doi<'62329'>
}

export interface EartharxivPreprintId {
  readonly _tag: 'eartharxiv'
  readonly value: Doi<'31223'>
}

export interface EcoevorxivPreprintId {
  readonly _tag: 'ecoevorxiv'
  readonly value: Doi<'32942'>
}

export interface EdarxivPreprintId {
  readonly _tag: 'edarxiv'
  readonly value: Doi<'35542'>
}

export interface EngrxivPreprintId {
  readonly _tag: 'engrxiv'
  readonly value: Doi<'31224'>
}

export interface JxivPreprintId {
  readonly _tag: 'jxiv'
  readonly value: Doi<'51094'>
}

export interface LifecycleJournalPreprintId {
  readonly _tag: 'lifecycle-journal'
  readonly value: Doi<'17605'>
}

export interface MedrxivPreprintId {
  readonly _tag: 'medrxiv'
  readonly value: Doi<'1101'>
}

export interface MetaarxivPreprintId {
  readonly _tag: 'metaarxiv'
  readonly value: Doi<'31222'>
}

export interface NeurolibrePreprintId {
  readonly _tag: 'neurolibre'
  readonly value: Doi<'55458'>
}

export interface OsfPreprintId {
  readonly _tag: 'osf'
  readonly value: Doi<'17605'>
}

export interface OsfPreprintsPreprintId {
  readonly _tag: 'osf-preprints'
  readonly value: Doi<'31219'>
}

export interface PhilsciPreprintId {
  readonly _tag: 'philsci'
  readonly value: number
}

export interface PreprintsorgPreprintId {
  readonly _tag: 'preprints.org'
  readonly value: Doi<'20944'>
}

export interface PsyarxivPreprintId {
  readonly _tag: 'psyarxiv'
  readonly value: Doi<'31234'>
}

export interface PsychArchivesPreprintId {
  readonly _tag: 'psycharchives'
  readonly value: Doi<'23668'>
}

export interface ResearchSquarePreprintId {
  readonly _tag: 'research-square'
  readonly value: Doi<'21203'>
}

export interface ScieloPreprintId {
  readonly _tag: 'scielo'
  readonly value: Doi<'1590'>
}

export interface ScienceOpenPreprintId {
  readonly _tag: 'science-open'
  readonly value: Doi<'14293'>
}

export interface SocarxivPreprintId {
  readonly _tag: 'socarxiv'
  readonly value: Doi<'31235'>
}

export interface SsrnPreprintId {
  readonly _tag: 'ssrn'
  readonly value: Doi<'2139'>
}

export interface TechrxivPreprintId {
  readonly _tag: 'techrxiv'
  readonly value: Doi<'36227'>
}

export interface VerixivPreprintId {
  readonly _tag: 'verixiv'
  readonly value: Doi<'12688'>
}

export interface ZenodoPreprintId {
  readonly _tag: 'zenodo'
  readonly value: Doi<'5281'>
}

export interface BiorxivOrMedrxivPreprintId {
  readonly _tag: 'biorxiv-medrxiv'
  readonly value: Doi<'1101'>
}

export interface OsfOrLifecycleJournalPreprintId {
  readonly _tag: 'osf-lifecycle-journal'
  readonly value: Doi<'17605'>
}

export interface ZenodoOrAfricarxivPreprintId {
  readonly _tag: 'zenodo-africarxiv'
  readonly value: Doi<'5281'>
}

export class MultipleIndeterminatePreprintIds extends Data.TaggedClass('MultipleIndeterminatePreprintIds')<{
  ids: Array.NonEmptyArray<IndeterminatePreprintId>
}> {}

export const PreprintIdEquivalence: Equivalence.Equivalence<IndeterminatePreprintId> = (a, b) => {
  if (a._tag !== b._tag) {
    return false
  }

  if (a._tag === 'philsci') {
    return a.value === b.value
  }

  return FptsToEffect.eq(eqDoi)(a.value, b.value as typeof a.value)
}

export const isPreprintDoi: Predicate.Refinement<Doi, Extract<IndeterminatePreprintId, { value: Doi }>['value']> =
  hasRegistrant(
    '1101',
    '1590',
    '2139',
    '5281',
    '6084',
    '12688',
    '14293',
    '17605',
    '21203',
    '26434',
    '20944',
    '22541',
    '23668',
    '31124',
    '31219',
    '31222',
    '31223',
    '31224',
    '31234',
    '31235',
    '31730',
    '32942',
    '35542',
    '36227',
    '48550',
    '51094',
    '55458',
    '57844',
    '60763',
    '62329',
  )

export const PreprintDoiD: D.Decoder<unknown, Extract<IndeterminatePreprintId, { value: Doi }>['value']> =
  D.fromRefinement(Predicate.compose(isDoi, isPreprintDoi), 'DOI')

export const parsePreprintDoi: (input: string) => Option.Option<Extract<IndeterminatePreprintId, { value: Doi }>> =
  flow(parse, FptsToEffect.option, Option.filter(isPreprintDoi), Option.map(fromPreprintDoi))

export function fromPreprintDoi<D extends Extract<IndeterminatePreprintId, { value: Doi }>['value']>(
  doi: D,
): Extract<IndeterminatePreprintId, { value: D }>
export function fromPreprintDoi(
  doi: Extract<IndeterminatePreprintId, { value: Doi }>['value'],
): Extract<IndeterminatePreprintId, { value: Doi }> {
  return match(doi)
    .when(hasRegistrant('1101'), doi => ({ _tag: 'biorxiv-medrxiv', value: doi }) satisfies BiorxivOrMedrxivPreprintId)
    .when(hasRegistrant('1590'), doi => ({ _tag: 'scielo', value: doi }) satisfies ScieloPreprintId)
    .when(hasRegistrant('2139'), doi => ({ _tag: 'ssrn', value: doi }) satisfies SsrnPreprintId)
    .when(
      hasRegistrant('5281'),
      doi => ({ _tag: 'zenodo-africarxiv', value: doi }) satisfies ZenodoOrAfricarxivPreprintId,
    )
    .when(hasRegistrant('6084'), doi => ({ _tag: 'africarxiv', value: doi }) satisfies AfricarxivFigsharePreprintId)
    .when(hasRegistrant('12688'), doi => ({ _tag: 'verixiv', value: doi }) satisfies VerixivPreprintId)
    .when(hasRegistrant('14293'), doi => ({ _tag: 'science-open', value: doi }) satisfies ScienceOpenPreprintId)
    .when(
      hasRegistrant('17605'),
      doi => ({ _tag: 'osf-lifecycle-journal', value: doi }) satisfies OsfOrLifecycleJournalPreprintId,
    )
    .when(hasRegistrant('21203'), doi => ({ _tag: 'research-square', value: doi }) satisfies ResearchSquarePreprintId)
    .when(hasRegistrant('22541'), doi => ({ _tag: 'authorea', value: doi }) satisfies AuthoreaPreprintId)
    .when(hasRegistrant('23668'), doi => ({ _tag: 'psycharchives', value: doi }) satisfies PsychArchivesPreprintId)
    .when(hasRegistrant('26434'), doi => ({ _tag: 'chemrxiv', value: doi }) satisfies ChemrxivPreprintId)
    .when(hasRegistrant('20944'), doi => ({ _tag: 'preprints.org', value: doi }) satisfies PreprintsorgPreprintId)
    .when(hasRegistrant('31124'), doi => ({ _tag: 'advance', value: doi }) satisfies AdvancePreprintId)
    .when(hasRegistrant('31219'), doi => ({ _tag: 'osf-preprints', value: doi }) satisfies OsfPreprintsPreprintId)
    .when(hasRegistrant('31222'), doi => ({ _tag: 'metaarxiv', value: doi }) satisfies MetaarxivPreprintId)
    .when(hasRegistrant('31223'), doi => ({ _tag: 'eartharxiv', value: doi }) satisfies EartharxivPreprintId)
    .when(hasRegistrant('31224'), doi => ({ _tag: 'engrxiv', value: doi }) satisfies EngrxivPreprintId)
    .when(hasRegistrant('31234'), doi => ({ _tag: 'psyarxiv', value: doi }) satisfies PsyarxivPreprintId)
    .when(hasRegistrant('31235'), doi => ({ _tag: 'socarxiv', value: doi }) satisfies SocarxivPreprintId)
    .when(hasRegistrant('31730'), doi => ({ _tag: 'africarxiv', value: doi }) satisfies AfricarxivOsfPreprintId)
    .when(hasRegistrant('32942'), doi => ({ _tag: 'ecoevorxiv', value: doi }) satisfies EcoevorxivPreprintId)
    .when(hasRegistrant('35542'), doi => ({ _tag: 'edarxiv', value: doi }) satisfies EdarxivPreprintId)
    .when(hasRegistrant('36227'), doi => ({ _tag: 'techrxiv', value: doi }) satisfies TechrxivPreprintId)
    .when(hasRegistrant('48550'), doi => ({ _tag: 'arxiv', value: doi }) satisfies ArxivPreprintId)
    .when(hasRegistrant('51094'), doi => ({ _tag: 'jxiv', value: doi }) satisfies JxivPreprintId)
    .when(hasRegistrant('55458'), doi => ({ _tag: 'neurolibre', value: doi }) satisfies NeurolibrePreprintId)
    .when(hasRegistrant('57844'), doi => ({ _tag: 'arcadia-science', value: doi }) satisfies ArcadiaSciencePreprintId)
    .when(hasRegistrant('60763'), doi => ({ _tag: 'africarxiv', value: doi }) satisfies AfricarxivPreprintId)
    .when(hasRegistrant('62329'), doi => ({ _tag: 'curvenote', value: doi }) satisfies CurvenotePreprintId)
    .exhaustive()
}

export function fromUrl(url: URL): ReadonlyArray<IndeterminatePreprintId> {
  return match([url.hostname.replace('www.', ''), url.pathname.slice(1)])
    .with([P.union('doi.org', 'dx.doi.org'), P.select()], extractFromDoiPath)
    .with(['africarxiv.figshare.com', P.select()], extractFromFigsharePath('africarxiv'))
    .with(['arxiv.org', P.select()], extractFromArxivPath)
    .with(['authorea.com', P.select()], extractFromAuthoreaPath)
    .with(['biorxiv.org', P.select()], extractFromBiorxivMedrxivPath('biorxiv'))
    .with(['edarxiv.org', P.select()], extractFromEdarxivPath)
    .with(['engrxiv.org', P.select()], extractFromEngrxivPath)
    .with(['jxiv.jst.go.jp', P.select()], extractFromJxivPath)
    .with(['medrxiv.org', P.select()], extractFromBiorxivMedrxivPath('medrxiv'))
    .with([P.union('neurolibre.org', 'preprint.neurolibre.org'), P.select()], extractFromNeurolibrePath)
    .with(['osf.io', P.select()], extractFromOsfPath)
    .with(['philsci-archive.pitt.edu', P.select()], extractFromPhilsciPath)
    .with(['preprints.org', P.select()], extractFromPreprintsorgPath)
    .with(['psyarxiv.com', P.select()], extractFromPsyarxivPath)
    .with([P.union('researchsquare.com', 'assets.researchsquare.com'), P.select()], extractFromResearchSquarePath)
    .with(['preprints.scielo.org', P.select()], extractFromScieloPath)
    .with(['scienceopen.com', 'hosted-document'], () => extractFromScienceOpenQueryString(Url.urlParams(url)))
    .with(['ssrn.com', P.select()], extractFromSsrnPath)
    .with([P.union('download.ssrn.com', 'papers.ssrn.com'), P.string], () =>
      extractFromSsrnQueryString(Url.urlParams(url)),
    )
    .with(['techrxiv.org', P.select()], extractFromTechrxivPath)
    .with(['zenodo.org', P.select()], extractFromZenodoPath)
    .otherwise(Array.empty)
}

const extractFromDoiPath = flow(decodeURIComponent, parsePreprintDoi, Array.fromOption)

const extractFromArxivPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /\/((?:[a-z]+-[a-z]{2}\/)?[0-9.]+)(?:v[1-9][0-9]*)?(?:\..*)?$/i.exec(s)?.[1]),
  Option.andThen(flow(suffix => `10.48550/arXiv.${suffix}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromAuthoreaPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^doi\/full\/(.+?)$/i.exec(s)?.[1]),
  Option.filter(Predicate.compose(isDoi, hasRegistrant('22541'))),
  Option.andThen(doi => ({ _tag: 'authorea', value: doi }) satisfies AuthoreaPreprintId),
  Array.fromOption,
)

const extractFromBiorxivMedrxivPath = (type: 'biorxiv' | 'medrxiv') =>
  flow(
    decodeURIComponent,
    Option.liftNullable(s => /(?:^|\/)(?:content|lookup)\/.+\/([0-9.]+)(?:v[1-9][0-9]*)?(?:[./].*)?$/i.exec(s)?.[1]),
    Option.andThen(suffix => `10.1101/${suffix}`),
    Option.filter(Predicate.compose(isDoi, hasRegistrant('1101'))),
    Option.andThen(doi => ({ _tag: type, value: doi }) satisfies BiorxivPreprintId | MedrxivPreprintId),
    Array.fromOption,
  )

const extractFromEdarxivPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^(?:preprints\/)?([a-z0-9]+)(?:\/?$|\/download)/i.exec(s)?.[1]),
  Option.andThen(flow(id => `10.35542/osf.io/${id}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromEngrxivPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^preprint\/[^/]+\/([1-9][0-9]*)(?:\/|$)/i.exec(s)?.[1]),
  Option.andThen(flow(id => `10.31224/${id}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromFigsharePath = (type: 'africarxiv') =>
  flow(
    decodeURIComponent,
    Option.liftNullable(s => /^articles\/(?:.+?\/){2}([1-9][0-9]*)(?:$|\/)/i.exec(s)?.[1]),
    Option.andThen(id => `10.6084/m9.figshare.${id}.v1`),
    Option.filter(Predicate.compose(isDoi, hasRegistrant('6084'))),
    Option.andThen(doi => ({ _tag: type, value: doi }) satisfies AfricarxivFigsharePreprintId),
    Array.fromOption,
  )

const extractFromJxivPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^index\.php\/jxiv\/preprint\/(?:view|download)\/([1-9][0-9]*)(?:\/|$)/.exec(s)?.[1]),
  Option.andThen(flow(id => `10.51094/jxiv.${id}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromNeurolibrePath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^(?:papers\/)?10.55458\/neurolibre\.([0-9]+)(?:\/|\.|$)/.exec(s)?.[1]),
  Option.andThen(flow(id => `10.55458/neurolibre.${id}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromOsfPath = flow(
  decodeURIComponent,
  Option.liftNullable(s =>
    /^(?:(preprints)\/)?(?:(africarxiv|edarxiv|metaarxiv|psyarxiv|socarxiv)\/)?([a-z0-9]+)(?:$|\/)/i.exec(s),
  ),
  Option.andThen(([, preprints, server, id]) =>
    match([preprints, server])
      .with([P.optional('preprints'), 'africarxiv'], () => Array.of(`10.31730/osf.io/${id}`))
      .with([P.optional('preprints'), 'edarxiv'], () => Array.of(`10.35542/osf.io/${id}`))
      .with([P.optional('preprints'), 'metaarxiv'], () => Array.of(`10.31222/osf.io/${id}`))
      .with([P.optional('preprints'), 'psyarxiv'], () => Array.of(`10.31234/osf.io/${id}`))
      .with([P.optional('preprints'), 'socarxiv'], () => Array.of(`10.31235/osf.io/${id}`))
      .with(['preprints', P.optional(undefined)], () => Array.of(`10.31219/osf.io/${id}`))
      .otherwise(() => [`10.17605/osf.io/${id}`, `10.31219/osf.io/${id}`]),
  ),
  Option.getOrElse(Array.empty),
  Array.filterMap(parsePreprintDoi),
)

const extractFromPhilsciPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^(?:id\/eprint\/|cgi\/export\/)?([1-9][0-9]*)(?:\/|$)/.exec(s)?.[1]),
  Option.flatMap(flow(id => parseInt(id, 10), D.number.decode, FptsToEffect.either, Either.getRight)),
  Option.andThen(id => ({ _tag: 'philsci', value: id }) satisfies PhilsciPreprintId),
  Array.fromOption,
)

const extractFromPreprintsorgPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^manuscript\/([a-z0-9.]+)\/(v[1-9][0-9]*)(?:$|\/)/i.exec(s)),
  Option.andThen(flow(([, id, version]) => `10.20944/preprints${id}.${version}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromPsyarxivPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^(?:preprints\/)?([a-z0-9]+)(?:\/?$|\/download)/i.exec(s)?.[1]),
  Option.andThen(flow(id => `10.31234/osf.io/${id}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromResearchSquarePath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /\/(rs-[1-9][0-9]*\/v[1-9][0-9]*)(?:[./]|$)/.exec(s)?.[1]),
  Option.andThen(flow(id => `10.21203/rs.3.${id}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromScieloPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^index\.php\/scielo\/preprint\/(?:view|download)\/([1-9][0-9]*)(?:\/|$)/.exec(s)?.[1]),
  Option.andThen(flow(id => `10.1590/SciELOPreprints.${id}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromScienceOpenQueryString = flow(
  UrlParams.getFirst('doi'),
  Option.andThen(parsePreprintDoi),
  Array.fromOption,
)

const extractFromSsrnPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^abstract=([1-9][0-9]*)(?:\/|$)/i.exec(s)?.[1]),
  Option.andThen(flow(id => `10.2139/ssrn.${id}`, parsePreprintDoi)),
  Array.fromOption,
)

const extractFromSsrnQueryString = (urlParams: UrlParams.UrlParams) =>
  pipe(
    UrlParams.getFirst(urlParams, 'abstractid'),
    Option.orElse(() => UrlParams.getFirst(urlParams, 'abstractId')),
    Option.orElse(() => UrlParams.getFirst(urlParams, 'abstract_id')),
    Option.andThen(flow(id => `10.2139/ssrn.${id}`, parsePreprintDoi)),
    Array.fromOption,
  )

const extractFromTechrxivPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^doi\/(?:full|pdf|xml)\/(.+?)$/i.exec(s)?.[1]),
  Option.filter(Predicate.compose(isDoi, hasRegistrant('36227'))),
  Option.andThen(doi => ({ _tag: 'techrxiv', value: doi }) satisfies TechrxivPreprintId),
  Array.fromOption,
)

const extractFromZenodoPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^record\/([1-9][0-9]*)(?:$|\/)/.exec(s)?.[1]),
  Option.andThen(flow(id => `10.5281/zenodo.${id}`, parsePreprintDoi)),
  Array.fromOption,
)
