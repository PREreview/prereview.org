import type { Temporal } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import { Array, flow, Function, Match, pipe } from 'effect'
import type { Json, JsonRecord } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import safeStableStringify from 'safe-stable-stringify'
import { match, P } from 'ts-pattern'
import type { IndeterminatePreprintId, PreprintId } from '../Preprints/index.js'
import type { ScietyListEnv } from '../sciety-list/index.js'
import type { ClubId } from '../types/club-id.js'
import type { DomainId } from '../types/domain.js'
import type { FieldId } from '../types/field.js'
import { isPseudonym } from '../types/Pseudonym.js'
import type { SubfieldId } from '../types/subfield.js'

export interface Prereview {
  preprint: PreprintId
  createdAt: Temporal.PlainDate
  doi: Doi
  authors: ReadonlyArray<{ name: string; orcid?: Orcid }>
  language?: LanguageCode
  type: 'full' | 'structured'
  club?: ClubId
  live: boolean
  requested: boolean
  domains: ReadonlyArray<DomainId>
  fields: ReadonlyArray<FieldId>
  subfields: ReadonlyArray<SubfieldId>
}

export interface GetPrereviewsEnv {
  getPrereviews: () => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

const getPrereviews = (): RTE.ReaderTaskEither<GetPrereviewsEnv, 'unavailable', ReadonlyArray<Prereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }) => getPrereviews()))

const ReadonlyArrayE = flow(E.array, E.readonly)

const StringE: E.Encoder<string, string | { toString: () => string }> = { encode: String }

const DoiE: E.Encoder<string, Doi> = StringE

const PlainDateE: E.Encoder<string, Temporal.PlainDate> = StringE

const PreprintIdE = {
  encode: id =>
    match(id)
      .with({ _tag: 'PhilsciPreprintId' }, ({ value }) => `https://philsci-archive.pitt.edu/${value}/`)
      .with({ value: P.when(isDoi) }, ({ value }) => `doi:${value}`)
      .exhaustive(),
} satisfies E.Encoder<string, IndeterminatePreprintId>

const PrereviewE = pipe(
  E.struct({
    preprint: PreprintIdE,
    server: E.id<Server>(),
    createdAt: PlainDateE,
    doi: DoiE,
    authors: ReadonlyArrayE(E.struct({ author: StringE, authorType: StringE })),
    type: StringE,
    live: E.id(),
    requested: E.id(),
    domains: ReadonlyArrayE(StringE),
    fields: ReadonlyArrayE(StringE),
    subfields: ReadonlyArrayE(StringE),
  }),
  E.intersect(
    E.partial({
      language: StringE,
      club: StringE,
    }),
  ),
) satisfies E.Encoder<JsonRecord, TransformedPrereview>

type Server =
  | 'advance'
  | 'africarxiv'
  | 'arcadia-science'
  | 'arxiv'
  | 'authorea'
  | 'biorxiv'
  | 'chemrxiv'
  | 'curvenote'
  | 'eartharxiv'
  | 'ecoevorxiv'
  | 'edarxiv'
  | 'engrxiv'
  | 'jxiv'
  | 'lifecycle-journal'
  | 'medrxiv'
  | 'metaarxiv'
  | 'neurolibre'
  | 'osf'
  | 'osf-preprints'
  | 'philsci'
  | 'preprints.org'
  | 'psyarxiv'
  | 'psycharchives'
  | 'research-square'
  | 'scielo'
  | 'science-open'
  | 'socarxiv'
  | 'ssrn'
  | 'techrxiv'
  | 'verixiv'
  | 'zenodo'

interface TransformedPrereview {
  preprint: IndeterminatePreprintId
  server: Server
  createdAt: Temporal.PlainDate
  doi: Doi
  authors: ReadonlyArray<{ author: string; authorType: 'public' | 'pseudonym' }>
  language?: LanguageCode
  type: 'full' | 'structured'
  club?: ClubId
  live: boolean
  requested: boolean
  domains: ReadonlyArray<string>
  fields: ReadonlyArray<string>
  subfields: ReadonlyArray<string>
}

const PrereviewsE = ReadonlyArrayE(PrereviewE)

const JsonE: E.Encoder<string, Json> = { encode: safeStableStringify }

const preprintIdToServer = Match.typeTags<PreprintId, Server>()({
  AdvancePreprintId: () => 'advance',
  AfricarxivFigsharePreprintId: () => 'africarxiv',
  AfricarxivOsfPreprintId: () => 'africarxiv',
  AfricarxivUbuntunetPreprintId: () => 'africarxiv',
  AfricarxivZenodoPreprintId: () => 'africarxiv',
  ArcadiaSciencePreprintId: () => 'arcadia-science',
  ArxivPreprintId: () => 'arxiv',
  AuthoreaPreprintId: () => 'authorea',
  BiorxivPreprintId: () => 'biorxiv',
  ChemrxivPreprintId: () => 'chemrxiv',
  CurvenotePreprintId: () => 'curvenote',
  EartharxivPreprintId: () => 'eartharxiv',
  EcoevorxivPreprintId: () => 'ecoevorxiv',
  EdarxivPreprintId: () => 'edarxiv',
  EngrxivPreprintId: () => 'engrxiv',
  JxivPreprintId: () => 'jxiv',
  LifecycleJournalPreprintId: () => 'lifecycle-journal',
  MedrxivPreprintId: () => 'medrxiv',
  MetaarxivPreprintId: () => 'metaarxiv',
  NeurolibrePreprintId: () => 'neurolibre',
  OsfPreprintId: () => 'osf',
  OsfPreprintsPreprintId: () => 'osf-preprints',
  PhilsciPreprintId: () => 'philsci',
  PreprintsorgPreprintId: () => 'preprints.org',
  PsyarxivPreprintId: () => 'psyarxiv',
  PsychArchivesPreprintId: () => 'psycharchives',
  ResearchSquarePreprintId: () => 'research-square',
  ScieloPreprintId: () => 'scielo',
  ScienceOpenPreprintId: () => 'science-open',
  SocarxivPreprintId: () => 'socarxiv',
  SsrnPreprintId: () => 'ssrn',
  TechrxivPreprintId: () => 'techrxiv',
  VerixivPreprintId: () => 'verixiv',
  ZenodoPreprintId: () => 'zenodo',
})

const isAllowed = (authorizationHeader: string) =>
  pipe(
    RTE.ask<ScietyListEnv>(),
    RTE.chainEitherK(env => D.literal(`Bearer ${env.scietyListToken}`).decode(authorizationHeader)),
    RTE.bimap(() => 'forbidden' as const, Function.constVoid),
  )

const transform = (prereview: Prereview): TransformedPrereview => ({
  preprint: prereview.preprint,
  server: preprintIdToServer(prereview.preprint),
  createdAt: prereview.createdAt,
  doi: prereview.doi,
  authors: pipe(
    prereview.authors,
    Array.filter(author => author.orcid !== undefined || isPseudonym(author.name)),
    Array.map(author => ({
      author: author.orcid ?? author.name,
      authorType: author.orcid === undefined ? 'pseudonym' : 'public',
    })),
  ),
  language: prereview.language,
  type: prereview.type,
  club: prereview.club,
  live: prereview.live,
  requested: prereview.requested,
  domains: prereview.domains,
  fields: prereview.fields,
  subfields: prereview.subfields,
})

export const reviewsData = (
  authorizationHeader: string,
): RTE.ReaderTaskEither<ScietyListEnv & GetPrereviewsEnv, 'forbidden' | 'unavailable', string> =>
  pipe(
    authorizationHeader,
    isAllowed,
    RTE.chainW(getPrereviews),
    RTE.map(Array.map(transform)),
    RTE.map(PrereviewsE.encode),
    RTE.map(JsonE.encode),
  )
