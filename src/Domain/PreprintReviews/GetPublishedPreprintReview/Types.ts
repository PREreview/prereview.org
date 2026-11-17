import type { Temporal } from '@js-temporal/polyfill'
import { Data, type Array } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { ClubName } from '../../Clubs/index.ts'
import type { Html } from '../../../html.ts'
import type { PreprintId } from '../../Preprints/index.ts'
import type { Persona } from '../../Prereviewers/index.ts'
import type { Doi } from '../../../types/Doi.ts'
import type { TopicId } from '../../../types/Topic.ts'
import type { PreprintReviewImported, StructuredPrereviewSchema } from '../Events.ts'

export class PublishedPreprintReview extends Data.TaggedClass('PublishedPreprintReview')<{
  addendum?: Html
  authors: {
    named: Array.NonEmptyReadonlyArray<Persona>
    anonymous: number
  }
  club?: ClubName
  competingInterests: (typeof PreprintReviewImported.Type)['competingInterests']
  content:
    | { readonly _tag: 'Full'; readonly text: Html }
    | { readonly _tag: 'Structured'; readonly questions: typeof StructuredPrereviewSchema.Type }
  doi: Doi
  id: number
  language?: LanguageCode
  license: 'CC0-1.0' | 'CC-BY-4.0'
  published: Temporal.Instant | Temporal.PlainDate
  preprint: {
    id: PreprintId
    language: LanguageCode
    title: Html
    url: URL
  }
  live: boolean
  requested: boolean
  topics: ReadonlyArray<TopicId>
  useOfAi: (typeof PreprintReviewImported.Type)['useOfAi']
}> {}

export class PrereviewIsNotFound extends Data.TaggedError('PrereviewIsNotFound') {}

export class PrereviewIsUnavailable extends Data.TaggedError('PrereviewIsUnavailable')<{ cause?: unknown }> {}

export class PrereviewWasRemoved extends Data.TaggedError('PrereviewWasRemoved') {}
