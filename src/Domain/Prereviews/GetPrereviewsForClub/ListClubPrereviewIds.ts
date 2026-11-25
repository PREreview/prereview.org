import { Array, Data, flow, HashMap, Match, Option, Order, pipe, Result, Struct } from 'effect'
import { Queries } from '../../../EventSourcing/index.ts'
import { Temporal, Uuid } from '../../../types/index.ts'
import * as Events from '../../Events/index.ts'

export type Input = typeof Input.Type

const Input = Uuid.UuidSchema

export type ClubPrereviewId = Data.TaggedEnum<{
  PreprintReview: { readonly id: number }
  DatasetReview: { readonly id: Uuid.Uuid }
}>

export const ClubPrereviewId = Data.taggedEnum<ClubPrereviewId>()

export type Result = ReadonlyArray<ClubPrereviewId>

type PertinentEvent = Events.EventsForFilter<typeof filter>

const filter = Events.EventFilter({
  types: [
    'PreprintReviewImported',
    'PreprintReviewWasAddedToAClub',
    'DatasetReviewWasAddedToAClub',
    'DatasetReviewWasPublished',
  ],
})

interface State {
  readonly preprintReviewClubs: HashMap.HashMap<number, Uuid.Uuid>
  readonly preprintReviewsPublished: HashMap.HashMap<number, Temporal.Instant>
  readonly datasetReviewClubs: HashMap.HashMap<Uuid.Uuid, Uuid.Uuid>
  readonly datasetReviewsPublished: HashMap.HashMap<Uuid.Uuid, Temporal.Instant>
}

const initialState: State = {
  preprintReviewClubs: HashMap.empty(),
  preprintReviewsPublished: HashMap.empty(),
  datasetReviewClubs: HashMap.empty(),
  datasetReviewsPublished: HashMap.empty(),
}

const toInstant = (published: Temporal.Instant | Temporal.PlainDate): Temporal.Instant =>
  published instanceof Temporal.Instant ? published : published.toZonedDateTime({ timeZone: 'UTC' }).toInstant()

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    PreprintReviewImported: event => ({
      ...state,
      preprintReviewClubs:
        event.club === undefined
          ? state.preprintReviewClubs
          : HashMap.set(state.preprintReviewClubs, event.id, event.club),
      preprintReviewsPublished: HashMap.set(state.preprintReviewsPublished, event.id, toInstant(event.published)),
    }),
    PreprintReviewWasAddedToAClub: event => ({
      ...state,
      preprintReviewClubs: HashMap.set(state.preprintReviewClubs, event.preprintReviewId, event.clubId),
    }),
    DatasetReviewWasAddedToAClub: event => ({
      ...state,
      datasetReviewClubs: HashMap.set(state.datasetReviewClubs, event.datasetReviewId, event.clubId),
    }),
    DatasetReviewWasPublished: event => ({
      ...state,
      datasetReviewsPublished: HashMap.set(
        state.datasetReviewsPublished,
        event.datasetReviewId,
        toInstant(event.publicationDate),
      ),
    }),
  })

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  Array.reduce(events, state, (currentState, event) => {
    if (!Events.matches(event, filter)) {
      return currentState
    }

    return updateStateWithPertinentEvent(currentState, event)
  })

interface Entry {
  readonly prereview: ClubPrereviewId
  readonly published: Temporal.Instant
}

const query =
  (wasPrereviewRemoved: (id: number) => boolean) =>
  (state: State, clubId: Input): Result => {
    const preprintReviews = pipe(
      Array.fromIterable(state.preprintReviewClubs),
      Array.filter(([id, reviewClubId]) => reviewClubId === clubId && !wasPrereviewRemoved(id)),
      Array.flatMap(([id]) =>
        pipe(
          HashMap.get(state.preprintReviewsPublished, id),
          Option.map((published): Entry => ({ prereview: ClubPrereviewId.PreprintReview({ id }), published })),
          Option.toArray,
        ),
      ),
    )

    const datasetReviews = pipe(
      Array.fromIterable(state.datasetReviewClubs),
      Array.filter(([, reviewClubId]) => reviewClubId === clubId),
      Array.flatMap(([id]) =>
        pipe(
          HashMap.get(state.datasetReviewsPublished, id),
          Option.map((published): Entry => ({ prereview: ClubPrereviewId.DatasetReview({ id }), published })),
          Option.toArray,
        ),
      ),
    )

    return pipe(
      Array.appendAll(preprintReviews, datasetReviews),
      Array.sortWith(Struct.get('published'), Order.flip(Temporal.OrderInstant)),
      Array.map(Struct.get('prereview')),
    )
  }

export const ListClubPrereviewIds = (wasPrereviewRemoved: (id: number) => boolean) =>
  Queries.StatefulQuery({
    name: 'Prereviews.getPrereviewsForClub.ListClubPrereviewIds',
    inputSchema: Input,
    initialState,
    updateStateWithEvents,
    query: flow(query(wasPrereviewRemoved), Result.succeed),
  })
