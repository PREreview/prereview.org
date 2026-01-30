import { Array, Boolean, Either, Equal, Match, Option, Record, Struct, type Types } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { FieldId } from '../../types/field.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
import type { SubfieldId } from '../../types/subfield.ts'
import { getTopicField, getTopicSubfield, type TopicId } from '../../types/Topic.ts'
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
] as const

type PertinentEvent = Types.ExtractTag<Events.Event, (typeof eventTypes)[number]>

export const filter = Events.EventFilter({ types: eventTypes })

type State = Record<
  Uuid.Uuid,
  {
    published: Temporal.Instant | undefined
    fields: ReadonlyArray<FieldId>
    subfields: ReadonlyArray<SubfieldId>
    language: LanguageCode | undefined
    preprintId: Preprints.IndeterminatePreprintId | undefined
  }
>

export const InitialState: State = Record.empty()

export const updateStateWithEvent = (state: State, event: Events.Event): State => {
  if (!Events.matches(event, filter)) {
    return state
  }

  return updateStateWithPertinentEvent(state, event)
}

const updateStateWithPertinentEvent = (map: State, event: PertinentEvent) =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasReceived: event =>
      Option.getOrElse(
        Record.modifyOption(map, event.reviewRequestId, review => ({
          ...review,
          preprintId: event.preprintId,
        })),
        () =>
          Record.set(map, event.reviewRequestId, {
            published: undefined,
            topics: [],
            fields: [],
            subfields: [],
            language: undefined,
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
            topics: [],
            fields: [],
            subfields: [],
            language: undefined,
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
            topics: [],
            fields: [],
            subfields: [],
            language: undefined,
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
            topics: [],
            fields: [],
            subfields: [],
            language: undefined,
            preprintId: event.preprintId,
          }),
      ),
    ReviewRequestForAPreprintWasCategorized: event =>
      Option.getOrElse(
        Record.modifyOption(map, event.reviewRequestId, review => ({
          ...review,
          topics: event.topics,
          fields: Array.map(event.topics, getTopicField),
          subfields: Array.map(event.topics, getTopicSubfield),
          language: event.language,
        })),
        () =>
          Record.set(map, event.reviewRequestId, {
            published: undefined,
            topics: event.topics,
            fields: Array.map(event.topics, getTopicField),
            subfields: Array.map(event.topics, getTopicSubfield),
            language: event.language,
            preprintId: undefined,
          }),
      ),
  })

export const query = (state: State, input: Input): Result =>
  Either.gen(function* () {
    const filteredReviewRequests = Record.filter(state, reviewRequest =>
      Boolean.every([
        reviewRequest.published !== undefined,
        reviewRequest.preprintId !== undefined,
        input.language === undefined || Equal.equals(reviewRequest.language, input.language),
        input.field === undefined || Array.contains(reviewRequest.fields, input.field),
      ]),
    ) as Record<
      Uuid.Uuid,
      {
        published: Temporal.Instant
        topics: ReadonlyArray<TopicId>
        fields: ReadonlyArray<FieldId>
        subfields: ReadonlyArray<SubfieldId>
        language: LanguageCode
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
