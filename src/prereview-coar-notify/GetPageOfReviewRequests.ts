import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Equal, pipe, Schema } from 'effect'
import * as Preprints from '../Preprints/index.ts'
import { ReviewRequestsAreUnavailable } from '../review-requests-page/index.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { Field, Iso639, Subfield, Temporal } from '../types/index.ts'

export const ReviewRequestsSchema = Schema.Array(
  Schema.Struct({
    timestamp: Temporal.InstantSchema,
    preprint: Preprints.IndeterminatePreprintIdFromDoiSchema,
    fields: Schema.Array(Field.FieldIdSchema),
    subfields: Schema.Array(Subfield.SubfieldIdSchema),
    language: Schema.NullOr(Iso639.Iso6391Schema),
  }),
)

export type ReviewRequestFromPrereviewCoarNotify = (typeof ReviewRequestsSchema.Type)[number]

export const getPageOfReviewRequests = (
  baseUrl: URL,
  page = 1,
): Effect.Effect<
  ReadonlyArray<ReviewRequestFromPrereviewCoarNotify>,
  ReviewRequestsAreUnavailable,
  HttpClient.HttpClient
> =>
  pipe(
    HttpClient.get(new URL(`/requests?page=${page}`, baseUrl)),
    Effect.mapError(error => new ReviewRequestsAreUnavailable({ cause: error })),
    Effect.andThen(HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK))),
    Effect.andThen(HttpClientResponse.schemaBodyJson(ReviewRequestsSchema)),
    Effect.catchTag('ParseError', 'ResponseError', error => new ReviewRequestsAreUnavailable({ cause: error })),
    Effect.tapErrorTag('ReviewRequestsAreUnavailable', error =>
      Effect.logError('Failed to get review requests').pipe(Effect.annotateLogs({ error })),
    ),
  )
