import * as RTE from 'fp-ts/ReaderTaskEither'
import { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import * as TE from 'fp-ts/TaskEither'
import { LanguageCode } from 'iso-639-1'
import { Orcid } from 'orcid-id-ts'
import { Html } from './html'
import { IndeterminatePreprintId, PreprintId } from './preprint-id'
import { PartialDate } from './time'

export type Preprint = {
  abstract?: {
    language: LanguageCode
    text: Html
  }
  authors: ReadonlyNonEmptyArray<{
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

export interface GetPreprintEnv {
  getPreprint: (id: IndeterminatePreprintId) => TE.TaskEither<'not-found' | 'unavailable', Preprint>
}

export const getPreprint = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprint }: GetPreprintEnv) => getPreprint(id)))
