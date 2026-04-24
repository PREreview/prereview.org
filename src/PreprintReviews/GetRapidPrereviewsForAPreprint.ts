import type { Option } from 'effect'
import type * as Preprints from '../Preprints/index.ts'
import type * as Queries from '../Queries.ts'
import type { NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'

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

export declare const GetRapidPrereviewsForAPreprint: Queries.OnDemandQuery<'RapidPrereviewImported', [Input], Result>
