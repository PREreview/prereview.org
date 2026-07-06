import { Array, Either, HashMap, HashSet, Match, Schema } from 'effect'
import * as Events from '../../Events.ts'
import { type IndeterminatePreprintId, IndeterminatePreprintIdFromStringSchema } from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Uuid } from '../../types/Uuid.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  requesterId: OrcidId
  preprintId: IndeterminatePreprintId
}

export type Result = Either.Either<boolean, Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished>

type PertinentDecisionMadeEvent = Events.EventsForFilter<typeof decisionMadeFilter>

type PertinentReviewRequestEvent = Events.EventsForFilter<typeof reviewRequestFilter>

const decisionMadeFilter = Events.EventFilter({
  types: [
    'PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests',
    'PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests',
  ],
})

const reviewRequestFilter = Events.EventFilter({
  types: [
    'ReviewRequestForAPreprintWasStarted',
    'ReviewRequestForAPreprintWasPublished',
    'ReviewRequestByAPrereviewerWasImported',
  ],
})

interface State {
  readonly decisionMade: HashSet.HashSet<OrcidId>
  readonly reviewRequestsById: HashMap.HashMap<Uuid, { publicationStatus: 'published' | 'pending' }>
  readonly reviewRequestIdsByInput: HashMap.HashMap<string, Uuid>
}

const inputToHashKey = (input: Input): string =>
  `${input.requesterId}-${Schema.encodeSync(IndeterminatePreprintIdFromStringSchema)(input.preprintId)}`

const initialState: State = {
  decisionMade: HashSet.empty(),
  reviewRequestsById: HashMap.empty(),
  reviewRequestIdsByInput: HashMap.empty(),
}

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => {
  const decisionMade = HashSet.mutate(state.decisionMade, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, decisionMadeFilter)) {
        return currentState
      }

      return updateDecisionMadeStateWithPertinentEvent(currentState, event)
    }),
  )

  const reviewRequestsById = HashMap.mutate(state.reviewRequestsById, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, reviewRequestFilter)) {
        return currentState
      }

      return updateReviewRequestsByIdStateWithPertinentEvent(currentState, event)
    }),
  )

  const reviewRequestIdsByInput = HashMap.mutate(state.reviewRequestIdsByInput, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, reviewRequestFilter)) {
        return currentState
      }

      return updateReviewRequestIdsByInputStateWithPertinentEvent(currentState, event)
    }),
  )

  return { decisionMade, reviewRequestsById, reviewRequestIdsByInput }
}

const updateDecisionMadeStateWithPertinentEvent = (
  state: State['decisionMade'],
  event: PertinentDecisionMadeEvent,
): State['decisionMade'] =>
  Match.valueTags(event, {
    PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests: event =>
      HashSet.add(state, event.orcidId),
    PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests: event =>
      HashSet.add(state, event.orcidId),
  })

const updateReviewRequestsByIdStateWithPertinentEvent = (
  state: State['reviewRequestsById'],
  event: PertinentReviewRequestEvent,
): State['reviewRequestsById'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(state, event.reviewRequestId, { publicationStatus: 'pending' as const }),
    ReviewRequestForAPreprintWasPublished: event =>
      HashMap.modify(state, event.reviewRequestId, review => ({ ...review, publicationStatus: 'published' as const })),
    ReviewRequestByAPrereviewerWasImported: event =>
      HashMap.set(state, event.reviewRequestId, { publicationStatus: 'published' as const }),
  })

const updateReviewRequestIdsByInputStateWithPertinentEvent = (
  state: State['reviewRequestIdsByInput'],
  event: PertinentReviewRequestEvent,
): State['reviewRequestIdsByInput'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(
        state,
        inputToHashKey({ requesterId: event.requesterId, preprintId: event.preprintId }),
        event.reviewRequestId,
      ),
    ReviewRequestForAPreprintWasPublished: () => state,
    ReviewRequestByAPrereviewerWasImported: event =>
      HashMap.set(
        state,
        inputToHashKey({ requesterId: event.requester.orcidId, preprintId: event.preprintId }),
        event.reviewRequestId,
      ),
  })

const query = (state: State, input: Input): Result =>
  Either.gen(function* () {
    const reviewRequestId = yield* Either.fromOption(
      HashMap.get(state.reviewRequestIdsByInput, inputToHashKey(input)),
      () => new Errors.UnknownReviewRequest({}),
    )

    const reviewRequest = yield* Either.fromOption(
      HashMap.get(state.reviewRequestsById, reviewRequestId),
      () => new Errors.UnknownReviewRequest({}),
    )

    if (reviewRequest.publicationStatus === 'published') {
      return yield* Either.left(new Errors.ReviewRequestHasBeenPublished({}))
    }

    return !HashSet.has(state.decisionMade, input.requesterId)
  })

export const DoesAReviewRequestNeedADecisionOnReviewNotifications = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.doesAReviewRequestNeedADecisionOnReviewNotifications',
  initialState,
  updateStateWithEvents,
  query,
})
