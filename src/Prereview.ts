import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { type Array, Context, Data, type Effect } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from './html.js'
import type { ClubId } from './types/club-id.js'
import type { PreprintId } from './types/preprint-id.js'

import PlainDate = Temporal.PlainDate

export class PrereviewIsNotFound extends Data.TaggedError('PrereviewIsNotFound') {}

export class PrereviewIsUnavailable extends Data.TaggedError('PrereviewIsUnavailable') {}

export class PrereviewWasRemoved extends Data.TaggedError('PrereviewWasRemoved') {}

export class Prereview extends Data.TaggedClass('Prereview')<{
  addendum?: Html
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: string; orcid?: Orcid }>
    anonymous: number
  }
  club?: ClubId
  doi: Doi
  id: number
  language?: LanguageCode
  license: 'CC0-1.0' | 'CC-BY-4.0'
  published: PlainDate
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
