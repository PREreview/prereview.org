import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Equal, pipe, Schema } from 'effect'
import { RecentReviewRequestsAreUnavailable } from '../review-requests-page/index.js'
import * as StatusCodes from '../StatusCodes.js'
import { Field, Iso639, Subfield, Temporal } from '../types/index.js'
import * as PreprintId from '../types/preprint-id.js'

export const RecentReviewRequestsSchema = Schema.Array(
  Schema.Struct({
    timestamp: Temporal.InstantSchema,
    preprint: PreprintId.IndeterminatePreprintIdFromDoiSchema,
    fields: Schema.Array(Field.FieldIdSchema),
    subfields: Schema.Array(Subfield.SubfieldIdSchema),
    language: Schema.NullOr(Iso639.Iso6391Schema),
  }),
)

export type RecentReviewRequestFromPrereviewCoarNotify = (typeof RecentReviewRequestsSchema.Type)[number]

export const getPageOfReviewRequests = (
  baseUrl: URL,
  page = 1,
): Effect.Effect<
  ReadonlyArray<RecentReviewRequestFromPrereviewCoarNotify>,
  RecentReviewRequestsAreUnavailable,
  HttpClient.HttpClient
> =>
  pipe(
    HttpClient.get(new URL(`/requests?page=${page}`, baseUrl)),
    Effect.mapError(error => new RecentReviewRequestsAreUnavailable({ cause: error })),
    Effect.andThen(HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK))),
    Effect.andThen(HttpClientResponse.schemaBodyJson(RecentReviewRequestsSchema)),
    Effect.catchTag('ParseError', 'ResponseError', error => new RecentReviewRequestsAreUnavailable({ cause: error })),
    Effect.tapErrorTag('RecentReviewRequestsAreUnavailable', error =>
      Effect.logError('Failed to get recent review requests').pipe(Effect.annotateLogs({ error })),
    ),
  )
