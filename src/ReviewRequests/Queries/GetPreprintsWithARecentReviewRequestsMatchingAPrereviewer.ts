import { Array, Boolean, Either, flow, Match, Option, pipe, Record, Schema, Struct } from 'effect'
import * as Events from '../../Events.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import { Temporal, type OrcidId, type Uuid } from '../../types/index.ts'
import type { KeywordId } from '../../types/Keyword.ts'

export interface RecentReviewRequestMatchingAPrereviewer {
  readonly firstRequested: Temporal.Instant
  readonly lastRequested: Temporal.Instant
  readonly preprintId: Preprints.IndeterminatePreprintId
  readonly matchingKeywords: Array.NonEmptyReadonlyArray<KeywordId>
}

export interface Input {
  prereviewerId: OrcidId.OrcidId
}

export type Result = ReadonlyArray<RecentReviewRequestMatchingAPrereviewer>

const createFilter = ({ prereviewerId }: Input) =>
  Events.EventFilter([
    {
      types: ['PrereviewerSubscribedToAKeyword'],
      predicates: { prereviewerId },
    },
    {
      types: [
        'ReviewRequestForAPreprintWasReceived',
        'ReviewRequestForAPreprintWasAccepted',
        'ReviewRequestByAPrereviewerWasImported',
        'ReviewRequestFromAPreprintServerWasImported',
        'ReviewRequestForAPreprintWasCategorized',
      ],
    },
  ])

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  const subscribedKeywords = Array.flatMap(filteredEvents, event =>
    event._tag === 'PrereviewerSubscribedToAKeyword' ? [event.keywordId] : [],
  )

  const reviewRequests = Array.reduce(
    filteredEvents,
    Record.empty<
      Uuid.Uuid,
      {
        published: Temporal.Instant | undefined
        keywords: ReadonlyArray<KeywordId>
        preprintId: Preprints.IndeterminatePreprintId | undefined
      }
    >(),
    (map, event) =>
      Match.valueTags(event, {
        PrereviewerSubscribedToAKeyword: () => map,
        ReviewRequestForAPreprintWasReceived: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({
              ...review,
              preprintId: event.preprintId,
            })),
            () =>
              Record.set(map, event.reviewRequestId, {
                published: undefined,
                keywords: [],
                preprintId: event.preprintId,
              }),
          ),
        ReviewRequestForAPreprintWasAccepted: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({
              ...review,
              published: event.acceptedAt,
            })),
            () =>
              Record.set(map, event.reviewRequestId, {
                published: event.acceptedAt,
                keywords: [],
                preprintId: undefined,
              }),
          ),
        ReviewRequestByAPrereviewerWasImported: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({
              ...review,
              preprintId: event.preprintId,
              published: event.publishedAt,
            })),
            () =>
              Record.set(map, event.reviewRequestId, {
                published: event.publishedAt,
                keywords: [],
                preprintId: event.preprintId,
              }),
          ),
        ReviewRequestFromAPreprintServerWasImported: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({
              ...review,
              preprintId: event.preprintId,
              published: event.publishedAt,
            })),
            () =>
              Record.set(map, event.reviewRequestId, {
                published: event.publishedAt,
                keywords: [],
                preprintId: event.preprintId,
              }),
          ),
        ReviewRequestForAPreprintWasCategorized: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({
              ...review,
              keywords: event.keywords,
            })),
            () =>
              Record.set(map, event.reviewRequestId, {
                published: undefined,
                keywords: event.keywords,
                preprintId: undefined,
              }),
          ),
      }),
  )

  const filteredReviewRequests = Record.filter(reviewRequests, reviewRequest =>
    Boolean.every([
      reviewRequest.published !== undefined,
      reviewRequest.preprintId !== undefined,
      Array.some(reviewRequest.keywords, keyword => Array.contains(subscribedKeywords, keyword)),
    ]),
  ) as Record.ReadonlyRecord<
    Uuid.Uuid,
    {
      published: Temporal.Instant
      keywords: ReadonlyArray<KeywordId>
      preprintId: Preprints.IndeterminatePreprintId
    }
  >

  const sortedReviewRequests = Array.reverse(
    Array.sortWith(
      Array.map(Array.fromRecord(filteredReviewRequests), ([id, properties]) => ({ ...properties, id })),
      Struct.get('published'),
      Temporal.OrderInstant,
    ),
  )

  const reviewRequestsByPreprintId = Array.groupBy(sortedReviewRequests, reviewRequest =>
    Schema.encodeSync(Preprints.IndeterminatePreprintIdFromStringSchema)(reviewRequest.preprintId),
  )

  const reviewRequestTimesByPreprintId = Record.map(reviewRequestsByPreprintId, reviewRequests => ({
    firstRequested: Array.lastNonEmpty(reviewRequests).published,
    lastRequested: Array.headNonEmpty(reviewRequests).published,
    matchingKeywords: pipe(
      Array.flatten(Array.map(reviewRequests, Struct.get('keywords'))),
      Array.dedupe,
      Array.filter(keyword => Array.contains(subscribedKeywords, keyword)),
    ) as unknown as Array.NonEmptyReadonlyArray<KeywordId>,
  }))

  const sortedPreprintIds = Array.reverse(
    Array.sortWith(
      Array.map(Array.fromRecord(reviewRequestTimesByPreprintId), ([id, properties]) => ({
        ...properties,
        preprintId: Schema.decodeSync(Preprints.IndeterminatePreprintIdFromStringSchema)(id),
      })),
      Struct.get('lastRequested'),
      Temporal.OrderInstant,
    ),
  )

  return Array.take(sortedPreprintIds, 5)
}

export const GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer = Queries.OnDemandQuery({
  name: 'ReviewRequestQueries.getPreprintsWithARecentReviewRequestsMatchingAPrereviewer',
  createFilter,
  query: flow(query, Either.right),
})
