import { Array, Boolean, Either, Equal, Match, Option, Record, Struct } from 'effect'
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createFilter = (input: Input) =>
  Events.EventFilter({
    types: ['ReviewRequestForAPreprintWasAccepted', 'ReviewRequestForAPreprintWasCategorized'],
  })

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    const reviewRequests = Array.reduce(
      filteredEvents,
      Record.empty<
        Uuid.Uuid,
        {
          published: Temporal.Instant | undefined
          fields: ReadonlyArray<FieldId>
          subfields: ReadonlyArray<SubfieldId>
          language: LanguageCode | undefined
          preprintId: Preprints.IndeterminatePreprintId | undefined
        }
      >(),
      (map, event) =>
        Match.valueTags(event, {
          ReviewRequestForAPreprintWasAccepted: event =>
            Option.getOrElse(
              Record.modifyOption(map, event.reviewRequestId, review => ({
                ...review,
                published: event.acceptedAt,
                preprintId: event.preprintId,
              })),
              () =>
                Record.set(map, event.reviewRequestId, {
                  published: event.acceptedAt,
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
        }),
    )

    const filteredReviewRequests = Record.filter(reviewRequests, reviewRequest =>
      Boolean.every([
        reviewRequest.published !== undefined,
        reviewRequest.preprintId !== undefined,
        reviewRequest.language !== undefined &&
          Equal.equals(reviewRequest.language, input.language ?? reviewRequest.language),
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
