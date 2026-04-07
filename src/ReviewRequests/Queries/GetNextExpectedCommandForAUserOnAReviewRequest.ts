import { Array, Either, HashMap, Match, Schema } from 'effect'
import * as Events from '../../Events.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export type NextExpectedCommand = 'ChoosePersona' | 'PublishReviewRequest'

const eventTypes = [
  'ReviewRequestForAPreprintWasStarted',
  'PersonaForAReviewRequestForAPreprintWasChosen',
  'ReviewRequestForAPreprintWasPublished',
  'ReviewRequestByAPrereviewerWasImported',
] as const

type PertinentEvent = Events.EventSubset<typeof eventTypes>

const filter = Events.EventFilter({ types: eventTypes })

export interface Input {
  requesterId: OrcidId.OrcidId
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = Either.Either<
  NextExpectedCommand,
  Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished
>

interface ReviewRequest {
  requesterId: OrcidId.OrcidId
  preprintId: Preprints.IndeterminatePreprintId
  hasPersonaChoice: boolean
  requestState: 'published' | 'pending'
}

interface State {
  readonly reviewRequestsById: HashMap.HashMap<Uuid.Uuid, ReviewRequest>
  readonly reviewRequestIdsByInput: HashMap.HashMap<string, Uuid.Uuid>
}

const inputToHashKey = (input: Input): string =>
  `${input.requesterId}-${Schema.encodeSync(Preprints.IndeterminatePreprintIdFromStringSchema)(input.preprintId)}`

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => {
  const reviewRequestsById = HashMap.mutate(state.reviewRequestsById, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, filter)) {
        return currentState
      }

      return updateReviewRequestsByIdStateWithPertinentEvent(currentState, event)
    }),
  )

  const reviewRequestIdsByInput = HashMap.mutate(state.reviewRequestIdsByInput, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, filter)) {
        return currentState
      }

      return updateReviewRequestIdsByInputStateWithPertinentEvent(currentState, event)
    }),
  )

  return { reviewRequestsById, reviewRequestIdsByInput }
}

const updateReviewRequestsByIdStateWithPertinentEvent = (
  state: State['reviewRequestsById'],
  event: PertinentEvent,
): State['reviewRequestsById'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(state, event.reviewRequestId, {
        requesterId: event.requesterId,
        preprintId: event.preprintId,
        hasPersonaChoice: false,
        requestState: 'pending',
      } satisfies ReviewRequest),
    PersonaForAReviewRequestForAPreprintWasChosen: event =>
      HashMap.modify(
        state,
        event.reviewRequestId,
        review => ({ ...review, hasPersonaChoice: true }) satisfies ReviewRequest,
      ),
    ReviewRequestForAPreprintWasPublished: event =>
      HashMap.modify(
        state,
        event.reviewRequestId,
        review => ({ ...review, requestState: 'published' }) satisfies ReviewRequest,
      ),
    ReviewRequestByAPrereviewerWasImported: event =>
      HashMap.set(state, event.reviewRequestId, {
        requesterId: event.requester.orcidId,
        preprintId: event.preprintId,
        hasPersonaChoice: true,
        requestState: 'published',
      } satisfies ReviewRequest),
  })

const updateReviewRequestIdsByInputStateWithPertinentEvent = (
  state: State['reviewRequestIdsByInput'],
  event: PertinentEvent,
): State['reviewRequestIdsByInput'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(
        state,
        inputToHashKey({ requesterId: event.requesterId, preprintId: event.preprintId }),
        event.reviewRequestId,
      ),
    PersonaForAReviewRequestForAPreprintWasChosen: () => state,
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
      () => new Errors.UnknownReviewRequest({ cause: 'Unexpected query state' }),
    )

    if (reviewRequest.requestState === 'published') {
      return yield* Either.left(new Errors.ReviewRequestHasBeenPublished({}))
    }

    if (!reviewRequest.hasPersonaChoice) {
      return 'ChoosePersona'
    }

    return 'PublishReviewRequest'
  })

export const GetNextExpectedCommandForAUserOnAReviewRequest = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getNextExpectedCommandForAUserOnAReviewRequest',
  initialState: { reviewRequestsById: HashMap.empty(), reviewRequestIdsByInput: HashMap.empty() },
  updateStateWithEvents,
  query,
})
