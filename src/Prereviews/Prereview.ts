import type { Temporal } from '@js-temporal/polyfill'
import { Data, type Array } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid as OrcidId } from 'orcid-id-ts'
import type { ClubId } from '../Clubs/index.ts'
import type * as Datasets from '../Datasets/index.ts'
import type { Html } from '../html.ts'
import type * as Personas from '../Personas/index.ts'
import type * as Preprints from '../Preprints/index.ts'
import type { PreprintId } from '../Preprints/index.ts'
import type { Doi } from '../types/Doi.ts'
import type { FieldId } from '../types/field.ts'
import type { NonEmptyString, Uuid } from '../types/index.ts'
import type { SubfieldId } from '../types/subfield.ts'

export class Prereview extends Data.TaggedClass('Prereview')<{
  addendum?: Html
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: string; orcid?: OrcidId }>
    anonymous: number
  }
  club?: ClubId
  doi: Doi
  id: number
  language?: LanguageCode
  license: 'CC0-1.0' | 'CC-BY-4.0'
  published: Temporal.PlainDate
  preprint: {
    id: PreprintId
    language: LanguageCode
    title: Html
    url: URL
  }
  live: boolean
  requested: boolean
  structured: boolean
  text: Html
}> {}

export interface RecentPrereviews {
  readonly currentPage: number
  readonly totalPages: number
  readonly field?: FieldId
  readonly language?: LanguageCode
  readonly query?: NonEmptyString.NonEmptyString
  readonly recentPrereviews: Array.NonEmptyReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>
}

export class RecentPreprintPrereview extends Data.TaggedClass('RecentPreprintPrereview')<{
  id: number
  club?: ClubId
  reviewers: {
    named: Array.NonEmptyReadonlyArray<string>
    anonymous: number
  }
  published: Temporal.PlainDate
  fields: ReadonlyArray<FieldId>
  subfields: ReadonlyArray<SubfieldId>
  preprint: Preprints.PreprintTitle
}> {}

export class RecentDatasetPrereview extends Data.TaggedClass('RecentDatasetPrereview')<{
  author: Personas.Persona
  dataset: Datasets.DatasetTitle
  doi: Doi
  id: Uuid.Uuid
  published: Temporal.PlainDate
}> {}

export interface PreprintPrereview {
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: string; orcid?: OrcidId }>
    anonymous: number
  }
  club?: ClubId
  id: number
  language?: LanguageCode
  text: Html
}

export interface RapidPrereview {
  author: {
    name: string
    orcid?: OrcidId
  }
  questions: {
    availableCode: 'yes' | 'unsure' | 'na' | 'no'
    availableData: 'yes' | 'unsure' | 'na' | 'no'
    coherent: 'yes' | 'unsure' | 'na' | 'no'
    ethics: 'yes' | 'unsure' | 'na' | 'no'
    future: 'yes' | 'unsure' | 'na' | 'no'
    limitations: 'yes' | 'unsure' | 'na' | 'no'
    methods: 'yes' | 'unsure' | 'na' | 'no'
    newData: 'yes' | 'unsure' | 'na' | 'no'
    novel: 'yes' | 'unsure' | 'na' | 'no'
    peerReview: 'yes' | 'unsure' | 'na' | 'no'
    recommend: 'yes' | 'unsure' | 'na' | 'no'
    reproducibility: 'yes' | 'unsure' | 'na' | 'no'
  }
}

export class PrereviewIsNotFound extends Data.TaggedError('PrereviewIsNotFound') {}

export class PrereviewIsUnavailable extends Data.TaggedError('PrereviewIsUnavailable') {}

export class PrereviewWasRemoved extends Data.TaggedError('PrereviewWasRemoved') {}

export class PrereviewsAreUnavailable extends Data.TaggedError('PrereviewsAreUnavailable') {}

export class PrereviewsPageNotFound extends Data.TaggedError('PrereviewsPageNotFound') {}
