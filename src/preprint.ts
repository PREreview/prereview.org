import * as RTE from 'fp-ts/ReaderTaskEither'
import type { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from './html.js'
import type { PartialDate } from './time.js'
import type { IndeterminatePreprintId, PreprintId } from './types/preprint-id.js'

export interface Preprint {
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

export interface PreprintTitle {
  id: PreprintId
  language: LanguageCode
  title: Html
}

export interface DoesPreprintExistEnv {
  doesPreprintExist: (id: IndeterminatePreprintId) => TE.TaskEither<'not-a-preprint' | 'unavailable', boolean>
}

export interface ResolvePreprintIdEnv {
  resolvePreprintId: (
    id: IndeterminatePreprintId,
  ) => TE.TaskEither<'not-a-preprint' | 'not-found' | 'unavailable', PreprintId>
}

export interface GetPreprintEnv {
  getPreprint: (id: IndeterminatePreprintId) => TE.TaskEither<'not-found' | 'unavailable', Preprint>
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (id: IndeterminatePreprintId) => TE.TaskEither<'not-found' | 'unavailable', PreprintTitle>
}

export const doesPreprintExist = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ doesPreprintExist }: DoesPreprintExistEnv) => doesPreprintExist(id)))

export const resolvePreprintId = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ resolvePreprintId }: ResolvePreprintIdEnv) => resolvePreprintId(id)))

export const getPreprint = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprint }: GetPreprintEnv) => getPreprint(id)))

export const getPreprintTitle = (
  id: IndeterminatePreprintId,
): RTE.ReaderTaskEither<GetPreprintTitleEnv, 'not-found' | 'unavailable', PreprintTitle> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintTitle }) => getPreprintTitle(id)))
