import { HttpServerResponse } from 'effect/http'
import { Effect, Match, pipe, Schema, SchemaIssue, SchemaGetter } from 'effect'
import * as Preprints from '../Preprints/index.ts'
import * as ReviewRequests from '../Domain/ReviewRequests/index.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { DomainIdSchema } from '../types/domain.ts'
import { FieldIdSchema } from '../types/field.ts'
import { Iso639, Temporal, Uuid } from '../types/index.ts'
import { SubfieldIdSchema } from '../types/subfield.ts'

type Server = typeof ServerSchema.Type

const ServerSchema = Schema.Literals([
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
  'jmir-preprints',
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
  'radial',
  'research-square',
  'scielo',
  'science-open',
  'socarxiv',
  'ssrn',
  'techrxiv',
  'umsida',
  'verixiv',
  'zenodo',
])

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
  JmirPreprintId: () => 'jmir-preprints',
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
  RadialPreprintId: () => 'radial',
  ResearchSquarePreprintId: () => 'research-square',
  ScieloPreprintId: () => 'scielo',
  ScienceOpenPreprintId: () => 'science-open',
  SocarxivPreprintId: () => 'socarxiv',
  SsrnPreprintId: () => 'ssrn',
  TechrxivPreprintId: () => 'techrxiv',
  UmsidaPreprintId: () => 'umsida',
  VerixivPreprintId: () => 'verixiv',
  ZenodoPreprintId: () => 'zenodo',
})

const RequestSchema = Schema.Struct({
  requestId: Uuid.UuidSchema,
  timestamp: Temporal.InstantSchema,
  preprint: Preprints.IndeterminatePreprintIdFromStringSchema,
  server: Schema.Union([ServerSchema, Schema.Literal('unable to determine server')]),
  language: Schema.NullOr(Iso639.Iso6391Schema),
  fields: Schema.Array(FieldIdSchema),
  subfields: Schema.Array(SubfieldIdSchema),
  domains: Schema.Array(DomainIdSchema),
})

const DataToRequestSchema = RequestSchema.pipe(
  Schema.decodeTo(Schema.toType(ReviewRequests.ReviewRequestForStats), {
    decode: SchemaGetter.transformEffect(value =>
      Effect.fail(new SchemaIssue.Forbidden({ message: 'Not implemented.' }, value)),
    ),
    encode: SchemaGetter.transformEffect((data: ReviewRequests.ReviewRequestForStats) =>
      Effect.gen(function* () {
        const server = yield* pipe(
          Preprints.getPreprintId(data.preprintId),
          Effect.map(preprintIdToServer),
          Effect.catchTag(['NotAPreprint', 'PreprintIsNotFound'], () =>
            Effect.succeed('unable to determine server' as const),
          ),
          Effect.mapError(
            () => new SchemaIssue.InvalidValue({ message: 'Failed to get preprint ID' }, data.preprintId),
          ),
        )

        return {
          requestId: data.requestId,
          timestamp: data.published,
          preprint: data.preprintId,
          server,
          language: data.language ?? null,
          fields: data.fields,
          subfields: data.subfields,
          domains: data.domains,
        }
      }),
    ),
  }),
)

export const RequestsData = pipe(
  ReviewRequests.listAllPublishedReviewRequestsForStats(),
  Effect.andThen(HttpServerResponse.schemaJson(Schema.Array(DataToRequestSchema), { concurrency: 'unbounded' })),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Failed to create requests data list'), { error })),
  Effect.catchTags({
    HttpBodyError: () => Effect.succeed(HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable })),
    UnableToQuery: () => Effect.succeed(HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable })),
  }),
  Effect.withSpan('RequestsData'),
)
