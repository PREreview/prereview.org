import { Array, Data, HashMap, Match, Order, pipe, Result, Schema, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../../Events.ts'
import { Queries } from '../../../EventSourcing/index.ts'
import { type FieldId, FieldIdSchema } from '../../../types/field.ts'
import { Temporal, type Uuid } from '../../../types/index.ts'
import { Iso6391Schema } from '../../../types/iso639.ts'
import { getTopicField } from '../../../types/Topic.ts'

export type Input = typeof Input.Type

const Input = Schema.Struct({
  field: Schema.optional(FieldIdSchema),
  language: Schema.optional(Iso6391Schema),
  page: Schema.Int,
})

export type MatchingPrereviewId = Data.TaggedEnum<{
  PreprintReview: { readonly id: number }
  DatasetReview: { readonly id: Uuid.Uuid }
}>

export const MatchingPrereviewId = Data.taggedEnum<MatchingPrereviewId>()

export interface MatchingPrereviewIds {
  readonly currentPage: number
  readonly totalPages: number
  readonly ids: Array.NonEmptyReadonlyArray<MatchingPrereviewId>
}

export class PageNotFound extends Data.TaggedError('PageNotFound') {}

export type Result = Result.Result<MatchingPrereviewIds, PageNotFound>

const pageSize = 5

type PertinentEvent = Events.EventsForFilter<typeof filter>

const filter = Events.EventFilter({ types: ['PreprintReviewImported', 'DatasetReviewWasPublished'] })

interface PreprintReview {
  readonly _tag: 'PreprintReview'
  readonly id: number
  readonly published: Temporal.Instant
  readonly language: LanguageCode
  readonly fields: ReadonlyArray<FieldId>
}

interface DatasetReview {
  readonly _tag: 'DatasetReview'
  readonly id: Uuid.Uuid
  readonly published: Temporal.Instant
}

type Review = PreprintReview | DatasetReview

interface State {
  readonly preprintReviews: HashMap.HashMap<number, PreprintReview>
  readonly datasetReviews: HashMap.HashMap<Uuid.Uuid, DatasetReview>
  readonly newestFirst: ReadonlyArray<Review>
}

const toInstant = (published: Temporal.Instant | Temporal.PlainDate): Temporal.Instant =>
  published instanceof Temporal.Instant ? published : published.toZonedDateTime({ timeZone: 'UTC' }).toInstant()

const toPreprintReview = (event: Events.PreprintReviewImported): PreprintReview => ({
  _tag: 'PreprintReview',
  id: event.id,
  published: toInstant(event.published),
  language: event.language,
  fields: Array.dedupe(Array.map(event.topics, getTopicField)),
})

const toDatasetReview = (event: Events.DatasetReviewWasPublished): DatasetReview => ({
  _tag: 'DatasetReview',
  id: event.datasetReviewId,
  published: toInstant(event.publicationDate),
})

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    PreprintReviewImported: event => ({
      ...state,
      preprintReviews: HashMap.set(state.preprintReviews, event.id, toPreprintReview(event)),
    }),
    DatasetReviewWasPublished: event => ({
      ...state,
      datasetReviews: HashMap.set(state.datasetReviews, event.datasetReviewId, toDatasetReview(event)),
    }),
  })

const sortNewestFirst = (state: State): State => ({
  ...state,
  newestFirst: pipe(
    Array.appendAll(HashMap.toValues(state.preprintReviews), HashMap.toValues(state.datasetReviews)),
    Array.sortWith(Struct.get('published'), Order.flip(Temporal.OrderInstant)),
  ),
})

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => {
  const updatedState = Array.reduce(events, state, (currentState, event) => {
    if (!Events.matches(event, filter)) {
      return currentState
    }

    return updateStateWithPertinentEvent(currentState, event)
  })

  if (updatedState === state) {
    return state
  }

  return sortNewestFirst(updatedState)
}

const matches =
  (wasPrereviewRemoved: (id: number) => boolean, input: Input) =>
  (review: Review): boolean =>
    Match.valueTags(review, {
      PreprintReview: review =>
        !wasPrereviewRemoved(review.id) &&
        (input.field === undefined || Array.contains(review.fields, input.field)) &&
        (input.language === undefined || review.language === input.language),
      DatasetReview: () => input.field === undefined && input.language === undefined,
    })

const toMatchingPrereviewId = (review: Review): MatchingPrereviewId =>
  Match.valueTags(review, {
    PreprintReview: ({ id }) => MatchingPrereviewId.PreprintReview({ id }),
    DatasetReview: ({ id }) => MatchingPrereviewId.DatasetReview({ id }),
  })

const query =
  (wasPrereviewRemoved: (id: number) => boolean) =>
  (state: State, input: Input): Result => {
    const matching = Array.filter(state.newestFirst, matches(wasPrereviewRemoved, input))

    const totalPages = Math.ceil(matching.length / pageSize)

    return pipe(
      Array.take(Array.drop(matching, (input.page - 1) * pageSize), pageSize),
      Array.map(toMatchingPrereviewId),
      Result.liftPredicate(
        (ids): ids is Array.NonEmptyArray<MatchingPrereviewId> => input.page > 0 && Array.isArrayNonEmpty(ids),
        () => new PageNotFound(),
      ),
      Result.map(ids => ({ currentPage: input.page, totalPages, ids })),
    )
  }

export const ListMatchingPrereviewIds = (wasPrereviewRemoved: (id: number) => boolean) =>
  Queries.StatefulQuery({
    name: 'Prereviews.searchPrereviews.ListMatchingPrereviewIds',
    inputSchema: Input,
    initialState: {
      preprintReviews: HashMap.empty(),
      datasetReviews: HashMap.empty(),
      newestFirst: [],
    } satisfies State,
    updateStateWithEvents,
    query: query(wasPrereviewRemoved),
  })
