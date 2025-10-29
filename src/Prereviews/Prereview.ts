import type { Temporal } from '@js-temporal/polyfill'
import { Data, type Array } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid as OrcidId } from 'orcid-id-ts'
import type { ClubId } from '../Clubs/index.ts'
import type { Html } from '../html.ts'
import type * as Preprints from '../Preprints/index.ts'
import type { PreprintId } from '../Preprints/index.ts'
import type { Doi } from '../types/Doi.ts'
import type { FieldId } from '../types/field.ts'
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

export interface RecentPrereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: {
    readonly named: Array.NonEmptyReadonlyArray<string>
    readonly anonymous: number
  }
  readonly published: Temporal.PlainDate
  readonly fields: ReadonlyArray<FieldId>
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: Preprints.PreprintTitle
}

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
