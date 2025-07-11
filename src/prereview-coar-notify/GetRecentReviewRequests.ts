import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Equal, ParseResult, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import iso6391 from 'iso-639-1'
import * as FptsToEffect from '../FptsToEffect.js'
import { RecentReviewRequestsAreUnavailable } from '../review-requests-page/index.js'
import { isFieldId } from '../types/field.js'
import { Doi, Temporal } from '../types/index.js'
import { IndeterminatePreprintIdWithDoi, parsePreprintDoi } from '../types/preprint-id.js'
import { isSubfieldId } from '../types/subfield.js'

const IndeterminatePreprintIdFromDoiSchema = Schema.transformOrFail(
  Doi.DoiSchema,
  Schema.typeSchema(IndeterminatePreprintIdWithDoi),
  {
    strict: true,
    decode: (doi, _, ast) =>
      ParseResult.fromOption(
        FptsToEffect.option(parsePreprintDoi(doi)),
        () => new ParseResult.Type(ast, doi, 'Not a preprint DOI'),
      ),
    encode: id => ParseResult.succeed(id.value),
  },
)

const FieldIdSchema = pipe(Schema.String, Schema.filter(isFieldId))

const SubfieldIdSchema = pipe(Schema.String, Schema.filter(isSubfieldId))

const LanguageSchema = pipe(Schema.String, Schema.filter(iso6391.validate))

export const RecentReviewRequestsSchema = Schema.Array(
  Schema.Struct({
    timestamp: Temporal.InstantSchema,
    preprint: IndeterminatePreprintIdFromDoiSchema,
    fields: Schema.Array(FieldIdSchema),
    subfields: Schema.Array(SubfieldIdSchema),
    language: Schema.NullOr(LanguageSchema),
  }),
)

export type RecentReviewRequestFromPrereviewCoarNotify = (typeof RecentReviewRequestsSchema.Type)[number]

export const getRecentReviewRequests = (
  baseUrl: URL,
): Effect.Effect<
  ReadonlyArray<RecentReviewRequestFromPrereviewCoarNotify>,
  RecentReviewRequestsAreUnavailable,
  HttpClient.HttpClient
> =>
  pipe(
    HttpClient.get(new URL('/requests', baseUrl)),
    Effect.mapError(error => new RecentReviewRequestsAreUnavailable({ cause: error })),
    Effect.andThen(HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK))),
    Effect.andThen(HttpClientResponse.schemaBodyJson(RecentReviewRequestsSchema)),
    Effect.catchTag('ParseError', 'ResponseError', error => new RecentReviewRequestsAreUnavailable({ cause: error })),
    Effect.tapErrorTag('RecentReviewRequestsAreUnavailable', error =>
      Effect.logError('Failed to get recent review requests').pipe(Effect.annotateLogs({ error })),
    ),
  )
