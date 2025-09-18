import { Data } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type { DatasetId } from './DatasetId.js'

export class DatasetTitle extends Data.Class<{
  id: DatasetId
  language: LanguageCode
  title: Html
}> {}

export class DatasetIsNotFound extends Data.TaggedError('PreprintIsNotFound')<{ cause?: unknown }> {}

export class DatasetIsUnavailable extends Data.TaggedError('PreprintIsUnavailable')<{ cause?: unknown }> {}
