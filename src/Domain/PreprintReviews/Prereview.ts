import type { Temporal } from '@js-temporal/polyfill'
import { Data, type Array } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { ClubName } from '../Clubs/index.ts'
import type { Html } from '../../html.ts'
import type { PreprintId } from '../Preprints/index.ts'
import type { Doi } from '../../types/Doi.ts'
import type { Name } from '../../types/Name.ts'
import type { OrcidId } from '../../types/OrcidId.ts'

export class Prereview extends Data.TaggedClass('Prereview')<{
  addendum?: Html
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: Name; orcid?: OrcidId }>
    anonymous: number
  }
  club?: ClubName
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

export interface PreprintPrereview {
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: Name; orcid?: OrcidId }>
    anonymous: number
  }
  club?: ClubName
  id: number
  language?: LanguageCode
  text: Html
}
