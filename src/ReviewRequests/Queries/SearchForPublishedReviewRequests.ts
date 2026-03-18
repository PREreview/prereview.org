import { Array, Boolean, Either, Equal, HashMap, Match, Option, Order, Schema, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../Events.ts'
import * as Preprints from '../../Preprints/index.ts'
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
  'ReviewRequestForAPreprintWasStarted',
  'ReviewRequestForAPreprintWasPublished',
  'ReviewRequestForAPreprintWasReceived',
  'ReviewRequestForAPreprintWasAccepted',
  'ReviewRequestForAPreprintWasWithdrawn',
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

interface State {
  readonly reviewRequests: HashMap.HashMap<Uuid.Uuid, PublishedReviewRequest | UnpublishedReviewRequest>
  readonly mostRecentReviewRequestsByPreprint: HashMap.HashMap<string, PublishedReviewRequest & { id: Uuid.Uuid }>
}

const initialState: State = { reviewRequests: HashMap.empty(), mostRecentReviewRequestsByPreprint: HashMap.empty() }

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => {
  const reviewRequestsToRebuild = new Set<Uuid.Uuid>()

  const reviewRequests = HashMap.mutate(state.reviewRequests, mutableReviewRequests =>
    Array.reduce(events, mutableReviewRequests, (currentReviewRequests, event) => {
      if (!Events.matches(event, filter)) {
        return currentReviewRequests
      }

      reviewRequestsToRebuild.add(event.reviewRequestId)

      return updateReviewRequestStateWithPertinentEvent(currentReviewRequests, event)
    }),
  )

  const mostRecentReviewRequestsByPreprint = HashMap.mutate(
    state.mostRecentReviewRequestsByPreprint,
    mutableMostRecentReviewRequestsByPreprint =>
      Array.reduce(
        reviewRequestsToRebuild,
        mutableMostRecentReviewRequestsByPreprint,
        (currentMostRecentReviewRequestsByPreprint, reviewRequestId) => {
          const reviewRequest = Option.getOrUndefined(HashMap.get(reviewRequests, reviewRequestId))

          if (!reviewRequest?.published) {
            return currentMostRecentReviewRequestsByPreprint
          }

          const preprintId = preprintIdToString(reviewRequest.preprintId)

          const currentMostRecentReviewRequest = HashMap.get(currentMostRecentReviewRequestsByPreprint, preprintId)

          return Option.match(currentMostRecentReviewRequest, {
            onNone: () =>
              HashMap.set(currentMostRecentReviewRequestsByPreprint, preprintId, {
                ...reviewRequest,
                id: reviewRequestId,
              }),
            onSome: currentMostRecentReviewRequest => {
              if (
                Order.greaterThan(Temporal.OrderInstant)(
                  currentMostRecentReviewRequest.published,
                  reviewRequest.published,
                )
              ) {
                return currentMostRecentReviewRequestsByPreprint
              }

              return HashMap.set(currentMostRecentReviewRequestsByPreprint, preprintId, {
                ...reviewRequest,
                id: reviewRequestId,
              })
            },
          })
        },
      ),
  )

  return { reviewRequests, mostRecentReviewRequestsByPreprint }
}

const preprintIdToString: (preprintId: Preprints.IndeterminatePreprintId) => string = Schema.encodeSync(
  Preprints.IndeterminatePreprintIdFromStringSchema,
)

const updateReviewRequestStateWithPertinentEvent = (
  map: State['reviewRequests'],
  event: PertinentEvent,
): State['reviewRequests'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(map, event.reviewRequestId, {
        published: undefined,
        topics: [],
        fields: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestForAPreprintWasPublished: event =>
      HashMap.modify(map, event.reviewRequestId, review => ({
        ...review,
        published: event.publishedAt,
      })),
    ReviewRequestForAPreprintWasReceived: event =>
      HashMap.set(map, event.reviewRequestId, {
        published: undefined,
        topics: [],
        fields: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestForAPreprintWasAccepted: event =>
      HashMap.modify(map, event.reviewRequestId, review => ({
        ...review,
        published: event.acceptedAt,
      })),
    ReviewRequestForAPreprintWasWithdrawn: event => HashMap.remove(map, event.reviewRequestId),
    ReviewRequestByAPrereviewerWasImported: event =>
      HashMap.set(map, event.reviewRequestId, {
        published: event.publishedAt,
        topics: [],
        fields: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestFromAPreprintServerWasImported: event =>
      HashMap.set(map, event.reviewRequestId, {
        published: event.publishedAt,
        topics: [],
        fields: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestForAPreprintWasCategorized: event =>
      HashMap.modify(map, event.reviewRequestId, review => ({
        ...review,
        topics: event.topics,
        fields: Array.map(event.topics, getTopicField),
        language: event.language,
      })),
    ReviewRequestForAPreprintWasRecategorized: event =>
      HashMap.modify(map, event.reviewRequestId, review => ({
        ...review,
        language: event.language ?? review.language,
      })),
  })

const query = (state: State, input: Input): Result =>
  Either.gen(function* () {
    const fiteredMostRecentReviewRequestsByPreprint = HashMap.filter(
      state.mostRecentReviewRequestsByPreprint,
      reviewRequest =>
        Boolean.every([
          input.language === undefined || Equal.equals(reviewRequest.language, input.language),
          input.field === undefined || Array.contains(reviewRequest.fields, input.field),
        ]),
    )

    const sortedLatestReviewRequestForEachPreprint = Array.reverse(
      Array.sortWith(
        HashMap.values(fiteredMostRecentReviewRequestsByPreprint),
        Struct.get('published'),
        Temporal.OrderInstant,
      ),
    )

    const pagesOfLatestReviewRequestForEachPreprint = Array.chunksOf(sortedLatestReviewRequestForEachPreprint, 5)

    const pageOfLatestReviewRequestForEachPreprint = yield* Either.fromOption(
      Array.get(pagesOfLatestReviewRequestForEachPreprint, input.page - 1),
      () => new Errors.NoReviewRequestsFound({}),
    )

    return {
      currentPage: input.page,
      totalPages: pagesOfLatestReviewRequestForEachPreprint.length,
      field: input.field,
      language: input.language,
      reviewRequests: Array.map(pageOfLatestReviewRequestForEachPreprint, reviewRequest => ({
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
  updateStateWithEvents,
  query,
})
