import { Array, Either, flow, HashMap, HashSet, Match, Option, Schema } from 'effect'
import * as Events from '../../Events.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'

export type Input = Preprints.IndeterminatePreprintId

export type Result = HashSet.HashSet<OrcidId.OrcidId>

type PertinentEvent = Events.EventsForFilter<typeof filter>

const filter = Events.EventFilter({
  types: [
    'ReviewRequestForAPreprintWasStarted',
    'PrereviewerOptedInToNotificationsForReviewsOfAPreprint',
    'ReviewRequestForAPreprintWasPublished',
    'ReviewRequestForAPreprintWasWithdrawn',
  ],
})

interface PublishedReviewRequest {
  _tag: 'PublishedReviewRequest'
  preprintId: Preprints.IndeterminatePreprintId
  optedIn: boolean
  requesterId: OrcidId.OrcidId
}

interface ReviewRequestPendingPublication {
  _tag: 'ReviewRequestPendingPublication'
  preprintId: Preprints.IndeterminatePreprintId
  optedIn: boolean
  requesterId: OrcidId.OrcidId
}

type ReviewRequest = PublishedReviewRequest | ReviewRequestPendingPublication

interface State {
  readonly reviewRequests: HashMap.HashMap<Uuid.Uuid, ReviewRequest>
  readonly reviewRequestsByPreprintId: HashMap.HashMap<string, Array.NonEmptyReadonlyArray<Uuid.Uuid>>
}

const initialState: State = {
  reviewRequests: HashMap.empty(),
  reviewRequestsByPreprintId: HashMap.empty(),
}

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => {
  const pertinentEvents = Array.filter(events, Events.matches(filter))

  const reviewRequests = HashMap.mutate(state.reviewRequests, mutableReviewRequests =>
    Array.reduce(pertinentEvents, mutableReviewRequests, updateReviewRequestsStateWithPertinentEvent),
  )

  const reviewRequestsByPreprintId = HashMap.mutate(
    state.reviewRequestsByPreprintId,
    mutableReviewRequestsByPreprintId =>
      Array.reduce(
        pertinentEvents,
        mutableReviewRequestsByPreprintId,
        updateReviewRequestsByPreprintIdStateWithPertinentEvent,
      ),
  )

  return { reviewRequests, reviewRequestsByPreprintId }
}

const preprintIdToString: (preprintId: Preprints.IndeterminatePreprintId) => string = Schema.encodeSync(
  Preprints.IndeterminatePreprintIdFromStringSchema,
)

const updateReviewRequestsStateWithPertinentEvent = (
  state: State['reviewRequests'],
  event: PertinentEvent,
): State['reviewRequests'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(state, event.reviewRequestId, {
        _tag: 'ReviewRequestPendingPublication',
        preprintId: event.preprintId,
        optedIn: false,
        requesterId: event.requesterId,
      } satisfies ReviewRequestPendingPublication),
    ReviewRequestForAPreprintWasPublished: event =>
      HashMap.modify(
        state,
        event.reviewRequestId,
        review =>
          ({
            ...review,
            _tag: 'PublishedReviewRequest',
          }) satisfies PublishedReviewRequest,
      ),
    PrereviewerOptedInToNotificationsForReviewsOfAPreprint: event =>
      HashMap.modify(state, event.reviewRequestId, review => ({
        ...review,
        optedIn: true,
      })),
    ReviewRequestForAPreprintWasWithdrawn: event => HashMap.remove(state, event.reviewRequestId),
  })

const updateReviewRequestsByPreprintIdStateWithPertinentEvent = (
  state: State['reviewRequestsByPreprintId'],
  event: PertinentEvent,
): State['reviewRequestsByPreprintId'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.modifyAt(
        state,
        preprintIdToString(event.preprintId),
        flow(
          Option.match({ onNone: () => Array.of(event.reviewRequestId), onSome: Array.append(event.reviewRequestId) }),
          Option.some,
        ),
      ),
    ReviewRequestForAPreprintWasPublished: () => state,
    PrereviewerOptedInToNotificationsForReviewsOfAPreprint: () => state,
    ReviewRequestForAPreprintWasWithdrawn: () => state,
  })

const query = (state: State, preprintId: Input): Result => {
  const reviewRequestsForPreprintId = Option.getOrElse(
    HashMap.get(state.reviewRequestsByPreprintId, preprintIdToString(preprintId)),
    Array.empty,
  )

  return HashSet.mutate(HashSet.empty<OrcidId.OrcidId>(), prereviewerIds =>
    Array.reduce(reviewRequestsForPreprintId, prereviewerIds, (prereviewerIds, reviewRequestId) => {
      const reviewRequest = HashMap.get(state.reviewRequests, reviewRequestId)

      if (
        Option.isNone(reviewRequest) ||
        reviewRequest.value._tag !== 'PublishedReviewRequest' ||
        !reviewRequest.value.optedIn
      ) {
        return prereviewerIds
      }

      return HashSet.add(prereviewerIds, reviewRequest.value.requesterId)
    }),
  )
}

export const ListPrereviewersWhoHaveOptedInToNotificationsForReviewsOfAPreprint = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.listPrereviewersWhoHaveOptedInToNotificationsForReviewsOfAPreprint',
  initialState,
  updateStateWithEvents,
  query: flow(query, Either.right),
})
