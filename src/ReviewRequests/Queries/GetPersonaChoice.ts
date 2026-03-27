import { Array, Either, HashMap, Match, Option, Schema } from 'effect'
import * as Events from '../../Events.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

const eventTypes = [
  'ReviewRequestForAPreprintWasStarted',
  'PersonaForAReviewRequestForAPreprintWasChosen',
  'ReviewRequestForAPreprintWasPublished',
] as const

type PertinentEvent = Events.EventSubset<typeof eventTypes>

const filter = Events.EventFilter({ types: eventTypes })

export interface Input {
  requesterId: OrcidId.OrcidId
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = Either.Either<
  { personaChoice: Option.Option<'public' | 'pseudonym'>; reviewRequestId: Uuid.Uuid },
  Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished
>

interface ReviewRequest {
  requesterId: OrcidId.OrcidId
  preprintId: Preprints.IndeterminatePreprintId
  personaChoice: Option.Option<'public' | 'pseudonym'>
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
        personaChoice: Option.none(),
        requestState: 'pending',
      } satisfies ReviewRequest),
    PersonaForAReviewRequestForAPreprintWasChosen: event =>
      HashMap.modify(
        state,
        event.reviewRequestId,
        review => ({ ...review, personaChoice: Option.some(event.persona) }) satisfies ReviewRequest,
      ),
    ReviewRequestForAPreprintWasPublished: event =>
      HashMap.modify(
        state,
        event.reviewRequestId,
        review => ({ ...review, requestState: 'published' }) satisfies ReviewRequest,
      ),
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
  })

const query = (state: State, input: Input): Result => {
  const reviewRequestId = HashMap.get(state.reviewRequestIdsByInput, inputToHashKey(input))

  if (Option.isNone(reviewRequestId)) {
    return Either.left(new Errors.UnknownReviewRequest({}))
  }

  const reviewRequest = HashMap.get(state.reviewRequestsById, reviewRequestId.value)

  if (Option.isNone(reviewRequest)) {
    return Either.left(new Errors.UnknownReviewRequest({ cause: 'Unexpected query state' }))
  }

  if (reviewRequest.value.requestState === 'published') {
    return Either.left(new Errors.ReviewRequestHasBeenPublished({}))
  }

  return Either.right({ reviewRequestId: reviewRequestId.value, personaChoice: reviewRequest.value.personaChoice })
}

export const GetPersonaChoice = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getPersonaChoice',
  initialState: { reviewRequestsById: HashMap.empty(), reviewRequestIdsByInput: HashMap.empty() },
  updateStateWithEvents,
  query,
})
