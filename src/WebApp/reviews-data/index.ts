import { Array, Either, flow, Function, Match, pipe, Schema, Tuple } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import * as Clubs from '../../Clubs/index.ts'
import type { IndeterminatePreprintId, PreprintId } from '../../Preprints/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import { DomainIdSchema, type DomainId } from '../../types/domain.ts'
import { FieldIdSchema, type FieldId } from '../../types/field.ts'
import { Doi, Iso639, Temporal } from '../../types/index.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import { isPseudonym } from '../../types/Pseudonym.ts'
import { SubfieldIdSchema, type SubfieldId } from '../../types/subfield.ts'
import type { ScietyListEnv } from '../sciety-list/index.ts'

export interface Prereview {
  preprint: PreprintId
  createdAt: Temporal.PlainDate
  doi: Doi.Doi
  authors: ReadonlyArray<{ name: string; orcid?: OrcidId }>
  language?: LanguageCode
  type: 'full' | 'structured'
  club?: Clubs.ClubId
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

const PreprintIdWithDoiSchema = Schema.transform(
  Schema.TemplateLiteralParser('doi:', Preprints.IndeterminatePreprintIdFromDoiSchema),
  Schema.typeSchema(Preprints.IndeterminatePreprintIdWithDoi),
  {
    strict: true,
    decode: Tuple.getSecond,
    encode: id => Tuple.make('doi:' as const, id),
  },
)

const PreprintIdFromPhilsciIdSchema = Schema.transform(
  Schema.NonNegativeInt,
  Schema.typeSchema(Preprints.PhilsciPreprintId),
  { strict: true, decode: id => new Preprints.PhilsciPreprintId({ value: id }), encode: id => id.value },
)

const PhilsciPreprintIdSchema = Schema.transform(
  Schema.TemplateLiteralParser('https://philsci-archive.pitt.edu/', PreprintIdFromPhilsciIdSchema, '/'),
  Schema.typeSchema(Preprints.PhilsciPreprintId),
  {
    strict: true,
    decode: Tuple.at(1),
    encode: id => Tuple.make('https://philsci-archive.pitt.edu/' as const, id, '/' as const),
  },
)

const PreprintIdSchema = Schema.Union(PreprintIdWithDoiSchema, PhilsciPreprintIdSchema)

const ServerSchema = Schema.Literal(
  'advance',
  'africarxiv',
  'arcadia-science',
  'arxiv',
  'authorea',
  'biorxiv',
  'chemrxiv',
  'curvenote',
  'eartharxiv',
  'ecoevorxiv',
  'edarxiv',
  'engrxiv',
  'jxiv',
  'lifecycle-journal',
  'medrxiv',
  'metaarxiv',
  'neurolibre',
  'osf',
  'osf-preprints',
  'philsci',
  'preprints.org',
  'psyarxiv',
  'psycharchives',
  'research-square',
  'scielo',
  'science-open',
  'socarxiv',
  'ssrn',
  'techrxiv',
  'verixiv',
  'zenodo',
)

const PrereviewSchema = Schema.Struct({
  preprint: PreprintIdSchema,
  server: ServerSchema,
  createdAt: Temporal.PlainDateSchema,
  doi: Doi.DoiSchema,
  authors: Schema.Array(Schema.Struct({ author: Schema.String, authorType: Schema.Literal('public', 'pseudonym') })),
  language: Schema.optional(Iso639.Iso6391Schema),
  type: Schema.Literal('full', 'structured'),
  club: Schema.optional(Clubs.ClubIdSchema),
  live: Schema.Boolean,
  requested: Schema.Boolean,
  domains: Schema.Array(DomainIdSchema),
  fields: Schema.Array(FieldIdSchema),
  subfields: Schema.Array(SubfieldIdSchema),
})

type Server = (typeof ServerSchema.literals)[number]

interface TransformedPrereview {
  preprint: IndeterminatePreprintId
  server: Server
  createdAt: Temporal.PlainDate
  doi: Doi.Doi
  authors: ReadonlyArray<{ author: string; authorType: 'public' | 'pseudonym' }>
  language?: LanguageCode
  type: 'full' | 'structured'
  club?: Clubs.ClubId
  live: boolean
  requested: boolean
  domains: ReadonlyArray<DomainId>
  fields: ReadonlyArray<FieldId>
  subfields: ReadonlyArray<SubfieldId>
}

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
    RTE.chainEitherK(env =>
      Schema.decodeUnknownEither(Schema.TemplateLiteralParser('Bearer ', env.scietyListToken))(authorizationHeader),
    ),
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
    RTE.chainEitherKW(
      flow(
        Schema.encodeEither(Schema.parseJson(Schema.Array(PrereviewSchema))),
        Either.mapLeft(() => 'unavailable' as const),
      ),
    ),
  )
