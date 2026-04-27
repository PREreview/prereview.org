import { Array, Either, flow, Struct, type Option } from 'effect'
import * as Events from '../Events.ts'
import type * as Preprints from '../Preprints/index.ts'
import * as Queries from '../Queries.ts'
import { Temporal, type NonEmptyString, type OrcidId, type Uuid } from '../types/index.ts'

export type Input = Preprints.IndeterminatePreprintId

export interface RapidPrereviewForAPreprint {
  author: {
    persona: 'public' | 'pseudonym'
    orcidId: OrcidId.OrcidId
  }
  publishedAt: Temporal.Instant
  preprintId: Preprints.IndeterminatePreprintId
  rapidPrereviewId: Uuid.Uuid
  questions: {
    availableCode: 'yes' | 'unsure' | 'not applicable' | 'no'
    availableData: 'yes' | 'unsure' | 'not applicable' | 'no'
    coherent: 'yes' | 'unsure' | 'not applicable' | 'no'
    dataLink: Option.Option<NonEmptyString.NonEmptyString>
    ethics: 'yes' | 'unsure' | 'not applicable' | 'no'
    future: 'yes' | 'unsure' | 'not applicable' | 'no'
    limitations: 'yes' | 'unsure' | 'not applicable' | 'no'
    methods: 'yes' | 'unsure' | 'not applicable' | 'no'
    newData: 'yes' | 'unsure' | 'not applicable' | 'no'
    novel: 'yes' | 'unsure' | 'not applicable' | 'no'
    peerReview: 'yes' | 'unsure' | 'not applicable' | 'no'
    recommend: 'yes' | 'unsure' | 'not applicable' | 'no'
    reproducibility: 'yes' | 'unsure' | 'not applicable' | 'no'
    technicalComments: Option.Option<NonEmptyString.NonEmptyString>
    editorialComments: Option.Option<NonEmptyString.NonEmptyString>
  }
}

export type Result = ReadonlyArray<RapidPrereviewForAPreprint>

const createFilter = (preprintId: Input) =>
  Events.EventFilter({
    types: ['RapidPrereviewImported'],
    predicates: { preprintId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  return Array.sortWith(filteredEvents, Struct.get('publishedAt'), Temporal.OrderInstant)
}

export const GetRapidPrereviewsForAPreprint = Queries.OnDemandQuery({
  name: 'PreprintReviews.getRapidPrereviewsForAPreprint',
  createFilter,
  query: flow(query, Either.right),
})
