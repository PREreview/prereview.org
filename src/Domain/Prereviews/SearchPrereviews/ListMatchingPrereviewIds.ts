import { Array, Data, HashMap, Match, Order, pipe, Result, Schema, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../../Events.ts'
import * as Queries from '../../../Queries.ts'
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
  readonly published: Temporal.Instant
  readonly language: LanguageCode
  readonly fields: ReadonlyArray<FieldId>
}

interface State {
  readonly preprintReviews: HashMap.HashMap<number, PreprintReview>
  readonly datasetReviews: HashMap.HashMap<Uuid.Uuid, Temporal.Instant>
}

const toInstant = (published: Temporal.Instant | Temporal.PlainDate): Temporal.Instant =>
  published instanceof Temporal.Instant ? published : published.toZonedDateTime({ timeZone: 'UTC' }).toInstant()

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    PreprintReviewImported: event => ({
      ...state,
      preprintReviews: HashMap.set(state.preprintReviews, event.id, {
        published: toInstant(event.published),
        language: event.language,
        fields: Array.dedupe(Array.map(event.topics, getTopicField)),
      }),
    }),
    DatasetReviewWasPublished: event => ({
      ...state,
      datasetReviews: HashMap.set(state.datasetReviews, event.datasetReviewId, toInstant(event.publicationDate)),
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
  readonly prereview: MatchingPrereviewId
  readonly published: Temporal.Instant
}

const matchesFilters = (input: Input) => (preprintReview: PreprintReview) =>
  (input.field === undefined || Array.contains(preprintReview.fields, input.field)) &&
  (input.language === undefined || preprintReview.language === input.language)

const query =
  (wasPrereviewRemoved: (id: number) => boolean) =>
  (state: State, input: Input): Result => {
    const preprintReviews = pipe(
      Array.fromIterable(state.preprintReviews),
      Array.filter(([id, preprintReview]) => !wasPrereviewRemoved(id) && matchesFilters(input)(preprintReview)),
      Array.map(([id, { published }]): Entry => ({ prereview: MatchingPrereviewId.PreprintReview({ id }), published })),
    )

    const datasetReviews: ReadonlyArray<Entry> =
      input.field === undefined && input.language === undefined
        ? Array.map(Array.fromIterable(state.datasetReviews), ([id, published]): Entry => ({
            prereview: MatchingPrereviewId.DatasetReview({ id }),
            published,
          }))
        : []

    const matching = pipe(
      Array.appendAll(preprintReviews, datasetReviews),
      Array.sortWith(Struct.get('published'), Order.flip(Temporal.OrderInstant)),
    )

    const totalPages = Math.ceil(matching.length / pageSize)

    return pipe(
      Array.take(Array.drop(matching, (input.page - 1) * pageSize), pageSize),
      Array.map(Struct.get('prereview')),
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
    initialState: { preprintReviews: HashMap.empty(), datasetReviews: HashMap.empty() } satisfies State,
    updateStateWithEvents,
    query: query(wasPrereviewRemoved),
  })
