import type { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { type Array, Context, Data, type Effect } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from './html.ts'
import type { PreprintId } from './Preprints/index.ts'
import type { ClubId } from './types/club-id.ts'
import type { OrcidId } from './types/OrcidId.ts'

export class PrereviewIsNotFound extends Data.TaggedError('PrereviewIsNotFound') {}

export class PrereviewIsUnavailable extends Data.TaggedError('PrereviewIsUnavailable') {}

export class PrereviewWasRemoved extends Data.TaggedError('PrereviewWasRemoved') {}

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

export class GetPrereview extends Context.Tag('GetPrereview')<
  GetPrereview,
  (id: number) => Effect.Effect<Prereview, PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved>
>() {}
