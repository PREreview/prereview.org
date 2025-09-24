import { type Array, Data } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.ts'
import type { PartialDate } from '../time.ts'
import type { OrcidId } from '../types/index.ts'
import type { DatasetId } from './DatasetId.ts'

export class Dataset extends Data.Class<{
  abstract?: {
    language: LanguageCode
    text: Html
  }
  authors: Array.NonEmptyReadonlyArray<{
    name: string
    orcid?: OrcidId.OrcidId
  }>
  id: DatasetId
  posted: PartialDate
  title: {
    language: LanguageCode
    text: Html
  }
  url: URL
}> {}

export class DatasetTitle extends Data.Class<{
  id: DatasetId
  language: LanguageCode
  title: Html
}> {}

export class NotADataset extends Data.TaggedError('NotADataset')<{ cause?: unknown; datasetId: DatasetId }> {}

export class DatasetIsNotFound extends Data.TaggedError('DatasetIsNotFound')<{
  cause?: unknown
  datasetId: DatasetId
}> {}

export class DatasetIsUnavailable extends Data.TaggedError('DatasetIsUnavailable')<{
  cause?: unknown
  datasetId: DatasetId
}> {}
