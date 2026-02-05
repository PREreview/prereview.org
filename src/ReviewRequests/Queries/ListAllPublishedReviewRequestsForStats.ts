import { Array, Boolean, Either, flow, Match, Record, Schema, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../Events.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import { DomainIdSchema, type DomainId } from '../../types/domain.ts'
import { FieldIdSchema, type FieldId } from '../../types/field.ts'
import { Iso639, Temporal, type Uuid } from '../../types/index.ts'
import { SubfieldIdSchema, type SubfieldId } from '../../types/subfield.ts'
import { getTopicDomain, getTopicField, getTopicSubfield } from '../../types/Topic.ts'

export type ReviewRequestForStats = typeof ReviewRequestForStats.Type

export const ReviewRequestForStats = Schema.Struct({
  published: Temporal.InstantSchema,
  subfields: Schema.Array(SubfieldIdSchema),
  fields: Schema.Array(FieldIdSchema),
  domains: Schema.Array(DomainIdSchema),
  language: Schema.optional(Iso639.Iso6391Schema),
  preprintId: Preprints.IndeterminatePreprintId,
})

export type Result = ReadonlyArray<ReviewRequestForStats>

const eventTypes = [
  'ReviewRequestForAPreprintWasReceived',
  'ReviewRequestForAPreprintWasAccepted',
  'ReviewRequestByAPrereviewerWasImported',
  'ReviewRequestFromAPreprintServerWasImported',
  'ReviewRequestForAPreprintWasCategorized',
] as const

type PertinentEvent = Events.EventSubset<typeof eventTypes>

const filter = Events.EventFilter({ types: eventTypes })

type State = Record<
  Uuid.Uuid,
  {
    published: Temporal.Instant | undefined
    fields: ReadonlyArray<FieldId>
    subfields: ReadonlyArray<SubfieldId>
    domains: ReadonlyArray<DomainId>
    language: LanguageCode | undefined
    preprintId: Preprints.IndeterminatePreprintId
  }
>

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
        fields: [],
        subfields: [],
        domains: [],
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
        fields: [],
        subfields: [],
        domains: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestFromAPreprintServerWasImported: event =>
      Record.set(map, event.reviewRequestId, {
        published: event.publishedAt,
        fields: [],
        subfields: [],
        domains: [],
        language: undefined,
        preprintId: event.preprintId,
      }),
    ReviewRequestForAPreprintWasCategorized: event =>
      Record.modify(map, event.reviewRequestId, review => ({
        ...review,
        fields: Array.dedupe(Array.map(event.topics, getTopicField)),
        subfields: Array.dedupe(Array.map(event.topics, getTopicSubfield)),
        domains: Array.dedupe(Array.map(event.topics, getTopicDomain)),
        language: event.language,
      })),
  })

const query = (state: State): Result => {
  const filteredReviewRequests = Record.filter(state, reviewRequest =>
    Boolean.every([reviewRequest.published !== undefined]),
  ) as Record<Uuid.Uuid, ReviewRequestForStats>

  const sortedReviewRequests = Array.sortWith(
    Record.values(filteredReviewRequests),
    Struct.get('published'),
    Temporal.OrderInstant,
  )

  return sortedReviewRequests
}

export const ListAllPublishedReviewRequestsForStats = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.listAllPublishedReviewRequests',
  initialState,
  updateStateWithEvent,
  query: flow(query, Either.right),
})
