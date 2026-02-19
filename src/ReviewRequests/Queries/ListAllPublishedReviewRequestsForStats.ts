import { Array, Boolean, Either, flow, Record, Schema, Struct } from 'effect'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import { DomainIdSchema } from '../../types/domain.ts'
import { FieldIdSchema } from '../../types/field.ts'
import { Iso639, Temporal, type Uuid } from '../../types/index.ts'
import { SubfieldIdSchema } from '../../types/subfield.ts'
import * as shared from './sharedLogic.ts'

export type ReviewRequestForStats = typeof ReviewRequestForStats.Type

export const ReviewRequestForStats = Schema.Struct({
  published: Temporal.InstantSchema,
  subfields: Schema.Array(SubfieldIdSchema),
  fields: Schema.Array(FieldIdSchema),
  domains: Schema.Array(DomainIdSchema),
  language: Schema.optional(Iso639.Iso6391Schema),
  preprintId: Preprints.IndeterminatePreprintId,
})

export type Result = ReadonlyArray<ReviewRequestForStats>

const query = (state: shared.State): Result => {
  const filteredReviewRequests = Record.filter(state, reviewRequest =>
    Boolean.every([reviewRequest.published !== undefined]),
  ) as Record<Uuid.Uuid, ReviewRequestForStats>

  const sortedReviewRequests = Array.sortWith(
    Record.values(filteredReviewRequests),
    Struct.get('published'),
    Temporal.OrderInstant,
  )

  return sortedReviewRequests
}

export const ListAllPublishedReviewRequestsForStats = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.listAllPublishedReviewRequests',
  initialState: shared.initialState,
  updateStateWithEvent: shared.updateStateWithEvent,
  query: flow(query, Either.right),
})
