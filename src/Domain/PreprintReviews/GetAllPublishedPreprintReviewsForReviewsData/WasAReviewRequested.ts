import { Array, flow, HashMap, Match, Result, Schema } from 'effect'
import * as Events from '../../../Events.ts'
import { Queries } from '../../../EventSourcing/index.ts'
import { Temporal, type Uuid } from '../../../types/index.ts'
import { InstantSchema, PlainDateSchema } from '../../../types/Temporal.ts'
import * as Preprints from '../../Preprints/index.ts'

export type Input = typeof Input.Type

const Input = Schema.Struct({
  preprintId: Preprints.IndeterminatePreprintIdFromStringSchema,
  published: Schema.Union([InstantSchema, PlainDateSchema]),
})

export type Result = boolean

type PertinentEvent = Events.EventsForFilter<typeof filter>

const filter = Events.EventFilter({
  types: [
    'ReviewRequestForAPreprintWasStarted',
    'ReviewRequestForAPreprintWasPublished',
    'ReviewRequestForAPreprintWasReceived',
    'ReviewRequestForAPreprintWasAccepted',
    'ReviewRequestForAPreprintWasWithdrawn',
    'ReviewRequestByAPrereviewerWasImported',
    'ReviewRequestFromAPreprintServerWasImported',
  ],
})

interface ReviewRequest {
  preprintId: Preprints.IndeterminatePreprintId
  published?: Temporal.Instant
  withdrawn?: Temporal.Instant
}

type State = HashMap.HashMap<Uuid.Uuid, ReviewRequest>

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(state, event.reviewRequestId, { preprintId: event.preprintId }),
    ReviewRequestForAPreprintWasPublished: event =>
      HashMap.modify(state, event.reviewRequestId, request => ({ ...request, published: event.publishedAt })),
    ReviewRequestForAPreprintWasReceived: event =>
      HashMap.set(state, event.reviewRequestId, { preprintId: event.preprintId }),
    ReviewRequestForAPreprintWasAccepted: event =>
      HashMap.modify(state, event.reviewRequestId, request => ({ ...request, published: event.acceptedAt })),
    ReviewRequestForAPreprintWasWithdrawn: event =>
      HashMap.modify(state, event.reviewRequestId, request => ({ ...request, withdrawn: event.withdrawnAt })),
    ReviewRequestByAPrereviewerWasImported: event =>
      HashMap.set(state, event.reviewRequestId, { preprintId: event.preprintId, published: event.publishedAt }),
    ReviewRequestFromAPreprintServerWasImported: event =>
      HashMap.set(state, event.reviewRequestId, { preprintId: event.preprintId, published: event.publishedAt }),
  })

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  HashMap.mutate(state, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, filter)) {
        return currentState
      }

      return updateStateWithPertinentEvent(currentState, event)
    }),
  )

const compareWithReview = (instant: Temporal.Instant, reviewPublished: Input['published']): number => {
  if (reviewPublished instanceof Temporal.Instant) {
    return Temporal.Instant.compare(instant, reviewPublished)
  }

  return Temporal.PlainDate.compare(instant.toZonedDateTimeISO('UTC').toPlainDate(), reviewPublished)
}

const wasRequestedAtTheTime =
  (input: Input) =>
  (request: ReviewRequest): boolean => {
    if (!Preprints.PreprintIdEquivalence(request.preprintId, input.preprintId) || request.published === undefined) {
      return false
    }

    if (compareWithReview(request.published, input.published) > 0) {
      return false
    }

    return request.withdrawn === undefined || compareWithReview(request.withdrawn, input.published) >= 0
  }

const query = (state: State, input: Input): Result => HashMap.some(state, wasRequestedAtTheTime(input))

export const WasAReviewRequested = Queries.StatefulQuery({
  name: 'PreprintReviews.getAllPublishedPreprintReviewsForReviewsData.WasAReviewRequested',
  inputSchema: Input,
  initialState: HashMap.empty<Uuid.Uuid, ReviewRequest>(),
  updateStateWithEvents,
  query: flow(query, Result.succeed),
})
