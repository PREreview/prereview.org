import { HttpServerResponse } from '@effect/platform'
import { Effect, Match, ParseResult, pipe, Schema } from 'effect'
import * as Preprints from '../Preprints/index.ts'
import * as ReviewRequests from '../ReviewRequests/index.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { DomainIdSchema } from '../types/domain.ts'
import { FieldIdSchema } from '../types/field.ts'
import { Iso639, Temporal } from '../types/index.ts'
import { SubfieldIdSchema } from '../types/subfield.ts'

type Server = typeof ServerSchema.Type

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

const preprintIdToServer = Match.typeTags<Preprints.PreprintId, Server>()({
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

const RequestSchema = Schema.Struct({
  timestamp: Temporal.InstantSchema,
  preprint: Preprints.IndeterminatePreprintIdFromStringSchema,
  server: Schema.Union(ServerSchema, Schema.Literal('unable to determine server')),
  language: Schema.NullOr(Iso639.Iso6391Schema),
  fields: Schema.Array(FieldIdSchema),
  subfields: Schema.Array(SubfieldIdSchema),
  domains: Schema.Array(DomainIdSchema),
})

const DataToRequestSchema = Schema.transformOrFail(
  RequestSchema,
  Schema.typeSchema(ReviewRequests.ReviewRequestForStats),
  {
    strict: true,
    decode: (value, _, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, value, 'Not implemented.')),
    encode: (data: ReviewRequests.ReviewRequestForStats, _, ast) =>
      Effect.gen(function* () {
        const server = yield* pipe(
          Preprints.getPreprintId(data.preprintId),
          Effect.andThen(preprintIdToServer),
          Effect.orElseFail(() => new ParseResult.Type(ast, data.preprintId, 'Failed to get preprint ID')),
        )

        return {
          timestamp: data.published,
          preprint: data.preprintId,
          server,
          language: data.language ?? null,
          fields: data.fields,
          subfields: data.subfields,
          domains: data.domains,
        }
      }),
  },
)

export const RequestsData = pipe(
  ReviewRequests.listAllPublishedReviewRequestsForStats(),
  Effect.andThen(
    HttpServerResponse.schemaJson(Schema.Array(DataToRequestSchema).annotations({ concurrency: 'inherit' })),
  ),
  Effect.catchTags({
    HttpBodyError: () => HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable }),
    UnableToQuery: () => HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable }),
  }),
)
