import { Data, type Option, Schema } from 'effect'
import type * as Commands from '../Commands.ts'
import type * as Preprints from '../Preprints/index.ts'
import type { NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'
import * as Events from './Events.ts'

export interface Input {
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

export const ImportRapidPrereviewInput: Schema.Schema<Input> = Schema.typeSchema(Events.RapidPrereviewImported).pipe(
  Schema.omit('_tag'),
)

type State = RapidPrereviewDoesNotExist | RapidPrereviewAlreadyExists

class RapidPrereviewDoesNotExist extends Data.TaggedClass('RapidPrereviewDoesNotExist') {}

class RapidPrereviewAlreadyExists extends Data.TaggedClass('RapidPrereviewAlreadyExists')<{
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
}> {}

export class MismatchWithExistingData extends Data.TaggedError('MismatchWithExistingData')<{
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
}> {}

export declare const ImportRapidPrereview: Commands.Command<
  'RapidPrereviewImported',
  [Input],
  State,
  MismatchWithExistingData
>
