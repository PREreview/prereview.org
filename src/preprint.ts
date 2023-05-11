import * as RTE from 'fp-ts/ReaderTaskEither'
import type { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from './html'
import type { IndeterminatePreprintId, PreprintId } from './preprint-id'
import type { PartialDate } from './time'

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

export type PreprintTitle = {
  id: PreprintId
  language: LanguageCode
  title: Html
}

export interface GetPreprintEnv {
  getPreprint: (id: IndeterminatePreprintId) => TE.TaskEither<'not-found' | 'unavailable', Preprint>
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (id: IndeterminatePreprintId) => TE.TaskEither<'not-found' | 'unavailable', PreprintTitle>
}

export const getPreprint = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprint }: GetPreprintEnv) => getPreprint(id)))

export const getPreprintTitle = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintTitle }: GetPreprintTitleEnv) => getPreprintTitle(id)))
