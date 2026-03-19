import { Array, HashMap, Match } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import type { DomainId } from '../../types/domain.ts'
import type { FieldId } from '../../types/field.ts'
import type { OrcidId, Temporal, Uuid } from '../../types/index.ts'
import type { SubfieldId } from '../../types/subfield.ts'
import { getTopicDomain, getTopicField, getTopicSubfield, type TopicId } from '../../types/Topic.ts'

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

interface ReviewRequest {
  published: Temporal.Instant | undefined
  fields: ReadonlyArray<FieldId>
  topics: ReadonlyArray<TopicId>
  subfields: ReadonlyArray<SubfieldId>
  domains: ReadonlyArray<DomainId>
  language: LanguageCode | undefined
  preprintId: Preprints.IndeterminatePreprintId
  accepted: boolean
  requesterId: OrcidId.OrcidId | undefined
}

export type State = HashMap.HashMap<Uuid.Uuid, ReviewRequest>

const updateStateWithPertinentEvent = (map: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(map, event.reviewRequestId, {
        published: undefined,
        fields: [],
        subfields: [],
        domains: [],
        topics: [],
        language: undefined,
        preprintId: event.preprintId,
        accepted: false,
        requesterId: event.requesterId,
      }),
    ReviewRequestForAPreprintWasPublished: event =>
      HashMap.modify(map, event.reviewRequestId, review => ({
        ...review,
        published: event.publishedAt,
        accepted: true,
      })),
    ReviewRequestForAPreprintWasReceived: event =>
      HashMap.set(map, event.reviewRequestId, {
        published: undefined,
        fields: [],
        subfields: [],
        domains: [],
        topics: [],
        language: undefined,
        preprintId: event.preprintId,
        accepted: false,
        requesterId: undefined,
      }),
    ReviewRequestForAPreprintWasAccepted: event =>
      HashMap.modify(map, event.reviewRequestId, review => ({
        ...review,
        published: event.acceptedAt,
        accepted: true,
      })),
    ReviewRequestForAPreprintWasWithdrawn: event => HashMap.remove(map, event.reviewRequestId),
    ReviewRequestByAPrereviewerWasImported: event =>
      HashMap.set(map, event.reviewRequestId, {
        published: event.publishedAt,
        fields: [],
        subfields: [],
        domains: [],
        topics: [],
        language: undefined,
        preprintId: event.preprintId,
        accepted: true,
        requesterId: event.requester.orcidId,
      }),
    ReviewRequestFromAPreprintServerWasImported: event =>
      HashMap.set(map, event.reviewRequestId, {
        published: event.publishedAt,
        fields: [],
        subfields: [],
        domains: [],
        topics: [],
        language: undefined,
        preprintId: event.preprintId,
        accepted: true,
        requesterId: undefined,
      }),
    ReviewRequestForAPreprintWasCategorized: event =>
      HashMap.modify(map, event.reviewRequestId, review => ({
        ...review,
        fields: Array.dedupe(Array.map(event.topics, getTopicField)),
        subfields: Array.dedupe(Array.map(event.topics, getTopicSubfield)),
        domains: Array.dedupe(Array.map(event.topics, getTopicDomain)),
        language: event.language,
        topics: event.topics,
      })),
    ReviewRequestForAPreprintWasRecategorized: event =>
      HashMap.modify(map, event.reviewRequestId, review => ({
        ...review,
        language: event.language ?? review.language,
        topics: event.topics ?? review.topics,
      })),
  })

export const initialState: State = HashMap.empty()

export const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  HashMap.mutate(state, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, filter)) {
        return currentState
      }

      return updateStateWithPertinentEvent(currentState, event)
    }),
  )
