import { Url, UrlParams } from '@effect/platform'
import { Array, Data, type Equivalence, Option, ParseResult, Predicate, Schema, flow, pipe } from 'effect'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { Doi } from '../types/index.ts'

export type PreprintId = typeof PreprintId.Type

export type PreprintIdWithDoi = typeof PreprintIdWithDoi.Type

export type IndeterminatePreprintId = typeof IndeterminatePreprintId.Type

export type IndeterminatePreprintIdWithDoi = typeof IndeterminatePreprintIdWithDoi.Type

export class AdvancePreprintId extends Schema.TaggedClass<AdvancePreprintId>()('AdvancePreprintId', {
  value: Doi.RegistrantDoiSchema('31124'),
}) {}

export type AfricarxivPreprintId = typeof AfricarxivPreprintId.Type

export class AfricarxivFigsharePreprintId extends Schema.TaggedClass<AfricarxivFigsharePreprintId>()(
  'AfricarxivFigsharePreprintId',
  {
    value: Doi.RegistrantDoiSchema('6084'),
  },
) {}

export class AfricarxivOsfPreprintId extends Schema.TaggedClass<AfricarxivOsfPreprintId>()('AfricarxivOsfPreprintId', {
  value: Doi.RegistrantDoiSchema('31730'),
}) {}

export class AfricarxivUbuntunetPreprintId extends Schema.TaggedClass<AfricarxivUbuntunetPreprintId>()(
  'AfricarxivUbuntunetPreprintId',
  {
    value: Doi.RegistrantDoiSchema('60763'),
  },
) {}

export class AfricarxivZenodoPreprintId extends Schema.TaggedClass<AfricarxivZenodoPreprintId>()(
  'AfricarxivZenodoPreprintId',
  {
    value: Doi.RegistrantDoiSchema('5281'),
  },
) {}

export const AfricarxivPreprintId = Schema.Union(
  AfricarxivFigsharePreprintId,
  AfricarxivOsfPreprintId,
  AfricarxivUbuntunetPreprintId,
  AfricarxivZenodoPreprintId,
)

export class ArcadiaSciencePreprintId extends Schema.TaggedClass<ArcadiaSciencePreprintId>()(
  'ArcadiaSciencePreprintId',
  {
    value: Doi.RegistrantDoiSchema('57844'),
  },
) {}

export class ArxivPreprintId extends Schema.TaggedClass<ArxivPreprintId>()('ArxivPreprintId', {
  value: Doi.RegistrantDoiSchema('48550'),
}) {}

export class AuthoreaPreprintId extends Schema.TaggedClass<AuthoreaPreprintId>()('AuthoreaPreprintId', {
  value: Doi.RegistrantDoiSchema('22541'),
}) {}

export class BiorxivPreprintId extends Schema.TaggedClass<BiorxivPreprintId>()('BiorxivPreprintId', {
  value: Doi.RegistrantDoiSchema('1101', '64898'),
}) {}

export class ChemrxivPreprintId extends Schema.TaggedClass<ChemrxivPreprintId>()('ChemrxivPreprintId', {
  value: Doi.RegistrantDoiSchema('26434'),
}) {}

export class CurvenotePreprintId extends Schema.TaggedClass<CurvenotePreprintId>()('CurvenotePreprintId', {
  value: Doi.RegistrantDoiSchema('62329'),
}) {}

export class EartharxivPreprintId extends Schema.TaggedClass<EartharxivPreprintId>()('EartharxivPreprintId', {
  value: Doi.RegistrantDoiSchema('31223'),
}) {}

export class EcoevorxivPreprintId extends Schema.TaggedClass<EcoevorxivPreprintId>()('EcoevorxivPreprintId', {
  value: Doi.RegistrantDoiSchema('32942'),
}) {}

export class EdarxivPreprintId extends Schema.TaggedClass<EdarxivPreprintId>()('EdarxivPreprintId', {
  value: Doi.RegistrantDoiSchema('35542'),
}) {}

export class EngrxivPreprintId extends Schema.TaggedClass<EngrxivPreprintId>()('EngrxivPreprintId', {
  value: Doi.RegistrantDoiSchema('31224'),
}) {}

export class JxivPreprintId extends Schema.TaggedClass<JxivPreprintId>()('JxivPreprintId', {
  value: Doi.RegistrantDoiSchema('51094'),
}) {}

export class LifecycleJournalPreprintId extends Schema.TaggedClass<LifecycleJournalPreprintId>()(
  'LifecycleJournalPreprintId',
  {
    value: Doi.RegistrantDoiSchema('17605'),
  },
) {}

export class MedrxivPreprintId extends Schema.TaggedClass<MedrxivPreprintId>()('MedrxivPreprintId', {
  value: Doi.RegistrantDoiSchema('1101', '64898'),
}) {}

export class MetaarxivPreprintId extends Schema.TaggedClass<MetaarxivPreprintId>()('MetaarxivPreprintId', {
  value: Doi.RegistrantDoiSchema('31222'),
}) {}

export class NeurolibrePreprintId extends Schema.TaggedClass<NeurolibrePreprintId>()('NeurolibrePreprintId', {
  value: Doi.RegistrantDoiSchema('55458'),
}) {}

export class OsfPreprintId extends Schema.TaggedClass<OsfPreprintId>()('OsfPreprintId', {
  value: Doi.RegistrantDoiSchema('17605'),
}) {}

export class OsfPreprintsPreprintId extends Schema.TaggedClass<OsfPreprintsPreprintId>()('OsfPreprintsPreprintId', {
  value: Doi.RegistrantDoiSchema('31219'),
}) {}

export class PhilsciPreprintId extends Schema.TaggedClass<PhilsciPreprintId>()('PhilsciPreprintId', {
  value: Schema.NonNegativeInt,
}) {}

export class PreprintsorgPreprintId extends Schema.TaggedClass<PreprintsorgPreprintId>()('PreprintsorgPreprintId', {
  value: Doi.RegistrantDoiSchema('20944'),
}) {}

export class PsyarxivPreprintId extends Schema.TaggedClass<PsyarxivPreprintId>()('PsyarxivPreprintId', {
  value: Doi.RegistrantDoiSchema('31234'),
}) {}

export class PsychArchivesPreprintId extends Schema.TaggedClass<PsychArchivesPreprintId>()('PsychArchivesPreprintId', {
  value: Doi.RegistrantDoiSchema('23668'),
}) {}

export class ResearchSquarePreprintId extends Schema.TaggedClass<ResearchSquarePreprintId>()(
  'ResearchSquarePreprintId',
  { value: Doi.RegistrantDoiSchema('21203') },
) {}

export class ScieloPreprintId extends Schema.TaggedClass<ScieloPreprintId>()('ScieloPreprintId', {
  value: Doi.RegistrantDoiSchema('1590'),
}) {}

export class ScienceOpenPreprintId extends Schema.TaggedClass<ScienceOpenPreprintId>()('ScienceOpenPreprintId', {
  value: Doi.RegistrantDoiSchema('14293'),
}) {}

export class SocarxivPreprintId extends Schema.TaggedClass<SocarxivPreprintId>()('SocarxivPreprintId', {
  value: Doi.RegistrantDoiSchema('31235'),
}) {}

export class SsrnPreprintId extends Schema.TaggedClass<SsrnPreprintId>()('SsrnPreprintId', {
  value: Doi.RegistrantDoiSchema('2139'),
}) {}

export class TechrxivPreprintId extends Schema.TaggedClass<TechrxivPreprintId>()('TechrxivPreprintId', {
  value: Doi.RegistrantDoiSchema('36227'),
}) {}

export class VerixivPreprintId extends Schema.TaggedClass<VerixivPreprintId>()('VerixivPreprintId', {
  value: Doi.RegistrantDoiSchema('12688'),
}) {}

export class ZenodoPreprintId extends Schema.TaggedClass<ZenodoPreprintId>()('ZenodoPreprintId', {
  value: Doi.RegistrantDoiSchema('5281'),
}) {}

export class BiorxivOrMedrxivPreprintId extends Schema.TaggedClass<BiorxivOrMedrxivPreprintId>()(
  'BiorxivOrMedrxivPreprintId',
  { value: Doi.RegistrantDoiSchema('1101', '64898') },
) {}

export class OsfOrLifecycleJournalPreprintId extends Schema.TaggedClass<OsfOrLifecycleJournalPreprintId>()(
  'OsfOrLifecycleJournalPreprintId',
  { value: Doi.RegistrantDoiSchema('17605') },
) {}

export class ZenodoOrAfricarxivPreprintId extends Schema.TaggedClass<ZenodoOrAfricarxivPreprintId>()(
  'ZenodoOrAfricarxivPreprintId',
  { value: Doi.RegistrantDoiSchema('5281') },
) {}

export const PreprintIdWithDoi = Schema.Union(
  AdvancePreprintId,
  AfricarxivPreprintId,
  ArcadiaSciencePreprintId,
  ArxivPreprintId,
  AuthoreaPreprintId,
  BiorxivPreprintId,
  ChemrxivPreprintId,
  CurvenotePreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  JxivPreprintId,
  LifecycleJournalPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  NeurolibrePreprintId,
  OsfPreprintId,
  OsfPreprintsPreprintId,
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
  ZenodoPreprintId,
)

export const PreprintId = Schema.Union(PreprintIdWithDoi, PhilsciPreprintId)

export const IndeterminatePreprintIdWithDoi = Schema.Union(
  PreprintIdWithDoi,
  BiorxivOrMedrxivPreprintId,
  OsfOrLifecycleJournalPreprintId,
  ZenodoOrAfricarxivPreprintId,
)

export const IndeterminatePreprintId = Schema.Union(IndeterminatePreprintIdWithDoi, PhilsciPreprintId)

export class MultipleIndeterminatePreprintIds extends Data.TaggedClass('MultipleIndeterminatePreprintIds')<{
  ids: Array.NonEmptyArray<IndeterminatePreprintId>
}> {}

export const PreprintIdEquivalence: Equivalence.Equivalence<IndeterminatePreprintId> = (a, b) => {
  if (a._tag !== b._tag) {
    return false
  }

  if (a._tag === 'PhilsciPreprintId') {
    return a.value === b.value
  }

  return Doi.DoiEquivalence(a.value, b.value as typeof a.value)
}

export const isPreprintDoi: Predicate.Refinement<Doi.Doi, IndeterminatePreprintIdWithDoi['value']> = Doi.hasRegistrant(
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
  '64898',
)

export const IndeterminatePreprintIdFromDoiSchema = Schema.transformOrFail(
  Doi.DoiSchema,
  Schema.typeSchema(IndeterminatePreprintIdWithDoi),
  {
    strict: true,
    decode: (doi, _, ast) =>
      ParseResult.fromOption(parsePreprintDoi(doi), () => new ParseResult.Type(ast, doi, 'Not a preprint DOI')),
    encode: id => ParseResult.succeed(id.value),
  },
)

export const PreprintDoiD: D.Decoder<unknown, IndeterminatePreprintIdWithDoi['value']> = D.fromRefinement(
  Predicate.compose(Doi.isDoi, isPreprintDoi),
  'DOI',
)

export const parsePreprintDoi: (input: string) => Option.Option<IndeterminatePreprintIdWithDoi> = flow(
  Doi.parse,
  Option.filter(isPreprintDoi),
  Option.map(fromPreprintDoi),
)

export function fromPreprintDoi<D extends IndeterminatePreprintIdWithDoi['value']>(
  doi: D,
): Extract<IndeterminatePreprintId, { value: D }>
export function fromPreprintDoi(doi: IndeterminatePreprintIdWithDoi['value']): IndeterminatePreprintIdWithDoi {
  return match(doi)
    .when(Doi.hasRegistrant('1101'), doi => new BiorxivOrMedrxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('1590'), doi => new ScieloPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('2139'), doi => new SsrnPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('5281'), doi => new ZenodoOrAfricarxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('6084'), doi => new AfricarxivFigsharePreprintId({ value: doi }))
    .when(Doi.hasRegistrant('12688'), doi => new VerixivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('14293'), doi => new ScienceOpenPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('17605'), doi => new OsfOrLifecycleJournalPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('21203'), doi => new ResearchSquarePreprintId({ value: doi }))
    .when(Doi.hasRegistrant('22541'), doi => new AuthoreaPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('23668'), doi => new PsychArchivesPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('26434'), doi => new ChemrxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('20944'), doi => new PreprintsorgPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('31124'), doi => new AdvancePreprintId({ value: doi }))
    .when(Doi.hasRegistrant('31219'), doi => new OsfPreprintsPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('31222'), doi => new MetaarxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('31223'), doi => new EartharxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('31224'), doi => new EngrxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('31234'), doi => new PsyarxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('31235'), doi => new SocarxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('31730'), doi => new AfricarxivOsfPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('32942'), doi => new EcoevorxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('35542'), doi => new EdarxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('36227'), doi => new TechrxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('48550'), doi => new ArxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('51094'), doi => new JxivPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('55458'), doi => new NeurolibrePreprintId({ value: doi }))
    .when(Doi.hasRegistrant('57844'), doi => new ArcadiaSciencePreprintId({ value: doi }))
    .when(Doi.hasRegistrant('60763'), doi => new AfricarxivUbuntunetPreprintId({ value: doi }))
    .when(Doi.hasRegistrant('62329'), doi => new CurvenotePreprintId({ value: doi }))
    .when(Doi.hasRegistrant('64898'), doi => new BiorxivOrMedrxivPreprintId({ value: doi }))
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
  Option.filter(Predicate.compose(Doi.isDoi, Doi.hasRegistrant('22541'))),
  Option.andThen(doi => new AuthoreaPreprintId({ value: doi })),
  Array.fromOption,
)

const extractFromBiorxivMedrxivPath = (type: 'biorxiv' | 'medrxiv') =>
  flow(
    decodeURIComponent,
    Option.liftNullable(s => /(?:^|\/)(?:content|lookup)\/.+\/([0-9.]+)(?:v[1-9][0-9]*)?(?:[./].*)?$/i.exec(s)?.[1]),
    Option.andThen(suffix => `10.1101/${suffix}`),
    Option.filter(Predicate.compose(Doi.isDoi, Doi.hasRegistrant('1101'))),
    Option.andThen(doi =>
      type === 'biorxiv' ? new BiorxivPreprintId({ value: doi }) : new MedrxivPreprintId({ value: doi }),
    ),
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const extractFromFigsharePath = (type: 'africarxiv') =>
  flow(
    decodeURIComponent,
    Option.liftNullable(s => /^articles\/(?:.+?\/){2}([1-9][0-9]*)(?:$|\/)/i.exec(s)?.[1]),
    Option.andThen(id => `10.6084/m9.figshare.${id}.v1`),
    Option.filter(Predicate.compose(Doi.isDoi, Doi.hasRegistrant('6084'))),
    Option.andThen(doi => new AfricarxivFigsharePreprintId({ value: doi })),
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
    /^(?:(preprints)\/)?(?:(africarxiv|edarxiv|metaarxiv|psyarxiv|socarxiv)\/)?([a-z0-9]+)(?:_v([1-9][0-9]*))?(?:$|\/)/i.exec(
      s,
    ),
  ),
  Option.andThen(([, preprints, server, id, version]) =>
    match([preprints, server])
      .with([P.optional('preprints'), 'africarxiv'], () => makeOsfDois('31730', `${id}`, version))
      .with([P.optional('preprints'), 'edarxiv'], () => makeOsfDois('35542', `${id}`, version))
      .with([P.optional('preprints'), 'metaarxiv'], () => makeOsfDois('31222', `${id}`, version))
      .with([P.optional('preprints'), 'psyarxiv'], () => makeOsfDois('31234', `${id}`, version))
      .with([P.optional('preprints'), 'socarxiv'], () => makeOsfDois('31235', `${id}`, version))
      .with(['preprints', P.optional(undefined)], () => makeOsfDois('31219', `${id}`, version))
      .otherwise(() => [...makeOsfDois('17605', `${id}`, version), ...makeOsfDois('31219', `${id}`, version)]),
  ),
  Option.getOrElse(Array.empty),
  Array.filterMap(parsePreprintDoi),
)

const makeOsfDois = (prefix: string, id: string, version: string | undefined) =>
  typeof version === 'string'
    ? [`10.${prefix}/osf.io/${id}_v${version}`, `10.${prefix}/osf.io/${id}`]
    : Array.of(`10.${prefix}/osf.io/${id}`)

const extractFromPhilsciPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^(?:id\/eprint\/|cgi\/export\/)?([1-9][0-9]*)(?:\/|$)/.exec(s)?.[1]),
  Option.andThen(Schema.decodeOption(Schema.NumberFromString)),
  Option.andThen(id => new PhilsciPreprintId({ value: id })),
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
  Option.filter(Predicate.compose(Doi.isDoi, Doi.hasRegistrant('36227'))),
  Option.andThen(doi => new TechrxivPreprintId({ value: doi })),
  Array.fromOption,
)

const extractFromZenodoPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^records?\/([1-9][0-9]*)(?:$|\/)/.exec(s)?.[1]),
  Option.andThen(flow(id => `10.5281/zenodo.${id}`, parsePreprintDoi)),
  Array.fromOption,
)
