import { Array, Boolean, Either, Equal, Match, Record, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { FieldId } from '../../types/field.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
import { getTopicField, type TopicId } from '../../types/Topic.ts'
import * as Errors from '../Errors.ts'

export interface PageOfReviewRequests {
  readonly currentPage: number
  readonly totalPages: number
  readonly field?: FieldId
  readonly language?: LanguageCode
  readonly reviewRequests: Array.NonEmptyReadonlyArray<{
    readonly id: Uuid.Uuid
    readonly published: Temporal.Instant
    readonly topics: ReadonlyArray<TopicId>
    readonly preprintId: Preprints.IndeterminatePreprintId
  }>
}

export interface Input {
  field?: FieldId
  language?: LanguageCode
  page: number
}

export type Result = Either.Either<PageOfReviewRequests, Errors.NoReviewRequestsFound>

const eventTypes = [
  'ReviewRequestForAPreprintWasReceived',
  'ReviewRequestForAPreprintWasAccepted',
  'ReviewRequestByAPrereviewerWasImported',
  'ReviewRequestFromAPreprintServerWasImported',
  'ReviewRequestForAPreprintWasCategorized',
  'ReviewRequestForAPreprintWasRecategorized',
] as const

type PertinentEvent = Events.EventSubset<typeof eventTypes>

const filter = Events.EventFilter({ types: eventTypes })

interface PublishedReviewRequest {
  published: Temporal.Instant
  fields: ReadonlyArray<FieldId>
  language: LanguageCode | undefined
  preprintId: Preprints.IndeterminatePreprintId
  topics: ReadonlyArray<TopicId>
}

interface UnpublishedReviewRequest {
  published: undefined
  fields: ReadonlyArray<FieldId>
  language: LanguageCode | undefined
  preprintId: Preprints.IndeterminatePreprintId
  topics: ReadonlyArray<TopicId>
}

type State = Record<Uuid.Uuid, PublishedReviewRequest | UnpublishedReviewRequest>

const initialState: State = Record.empty()

const updateStateWithEvent = (state: State, event: Events.Event): State => {
  if (!Events.matches(event, filter)) {
    return state
  }

  return updateStateWithPertinentEvent(state, event)
}

const updateStateWithPertinentEvent = (map: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasReceived: event =>
      Record.set(map, event.reviewRequestId, {
        published: undefined,
        topics: [],
        fields: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestForAPreprintWasAccepted: event =>
      Record.modify(map, event.reviewRequestId, review => ({
        ...review,
        published: event.acceptedAt,
      })),
    ReviewRequestByAPrereviewerWasImported: event =>
      Record.set(map, event.reviewRequestId, {
        published: event.publishedAt,
        topics: [],
        fields: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestFromAPreprintServerWasImported: event =>
      Record.set(map, event.reviewRequestId, {
        published: event.publishedAt,
        topics: [],
        fields: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestForAPreprintWasCategorized: event =>
      Record.modify(map, event.reviewRequestId, review => ({
        ...review,
        topics: event.topics,
        fields: Array.map(event.topics, getTopicField),
        language: event.language,
      })),
    ReviewRequestForAPreprintWasRecategorized: event =>
      Record.modify(map, event.reviewRequestId, review => ({
        ...review,
        language: event.language ?? review.language,
      })),
  })

const query = (state: State, input: Input): Result =>
  Either.gen(function* () {
    const filteredReviewRequests = Record.filter(state, reviewRequest =>
      Boolean.every([
        reviewRequest.published !== undefined,
        input.language === undefined || Equal.equals(reviewRequest.language, input.language),
        input.field === undefined || Array.contains(reviewRequest.fields, input.field),
      ]),
    ) as Record<Uuid.Uuid, PublishedReviewRequest>

    const sortedReviewRequests = Array.reverse(
      Array.sortWith(
        Array.map(Array.fromRecord(filteredReviewRequests), ([id, properties]) => ({ ...properties, id })),
        Struct.get('published'),
        Temporal.OrderInstant,
      ),
    )

    const pagesOfSortedReviewRequests = Array.chunksOf(sortedReviewRequests, 5)

    const pageOfSortedReviewRequests = yield* Either.fromOption(
      Array.get(pagesOfSortedReviewRequests, input.page - 1),
      () => new Errors.NoReviewRequestsFound({}),
    )

    return {
      currentPage: input.page,
      totalPages: pagesOfSortedReviewRequests.length,
      field: input.field,
      language: input.language,
      reviewRequests: Array.map(pageOfSortedReviewRequests, reviewRequest => ({
        id: reviewRequest.id,
        published: reviewRequest.published,
        topics: reviewRequest.topics,
        preprintId: reviewRequest.preprintId,
      })),
    }
  })

export const SearchForPublishedReviewRequests = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.searchForPublishedReviewRequests',
  initialState,
  updateStateWithEvent,
  query,
})
