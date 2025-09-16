import { type Array, Data } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type { PartialDate } from '../time.js'
import type { Orcid } from '../types/Orcid.js'
import type { PreprintId } from './PreprintId.js'

export interface Preprint {
  abstract?: {
    language: LanguageCode
    text: Html
  }
  authors: Array.NonEmptyReadonlyArray<{
    name: string
    orcid?: Orcid
  }>
  id: PreprintId
  posted: PartialDate
  title: {
    language: LanguageCode
    text: Html
  }
  url: URL
}

export interface PreprintTitle {
  id: PreprintId
  language: LanguageCode
  title: Html
}

export class NotAPreprint extends Data.TaggedError('NotAPreprint')<{ cause?: unknown }> {}

export class PreprintIsNotFound extends Data.TaggedError('PreprintIsNotFound')<{ cause?: unknown }> {}

export class PreprintIsUnavailable extends Data.TaggedError('PreprintIsUnavailable')<{ cause?: unknown }> {}

export const Preprint = Data.struct<Preprint>
