import { Context, Data, type Effect } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
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
  doesPreprintExist: (id: IndeterminatePreprintId) => TE.TaskEither<NotAPreprint | PreprintIsUnavailable, boolean>
}

export interface ResolvePreprintIdEnv {
  resolvePreprintId: (
    id: IndeterminatePreprintId,
  ) => TE.TaskEither<NotAPreprint | PreprintIsNotFound | PreprintIsUnavailable, PreprintId>
}

export interface GetPreprintIdEnv {
  getPreprintId: (id: IndeterminatePreprintId) => TE.TaskEither<PreprintIsUnavailable, PreprintId>
}

export interface GetPreprintEnv {
  getPreprint: (id: IndeterminatePreprintId) => TE.TaskEither<PreprintIsNotFound | PreprintIsUnavailable, Preprint>
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (
    id: IndeterminatePreprintId,
  ) => TE.TaskEither<PreprintIsNotFound | PreprintIsUnavailable, PreprintTitle>
}

export class NotAPreprint extends Data.TaggedError('NotAPreprint') {}

export class PreprintIsNotFound extends Data.TaggedError('PreprintIsNotFound') {}

export class PreprintIsUnavailable extends Data.TaggedError('PreprintIsUnavailable') {}

export const Preprint = Data.struct<Preprint>

export class GetPreprint extends Context.Tag('GetPreprint')<
  GetPreprint,
  (id: IndeterminatePreprintId) => Effect.Effect<Preprint, PreprintIsNotFound | PreprintIsUnavailable>
>() {}

export const doesPreprintExist = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ doesPreprintExist }: DoesPreprintExistEnv) => doesPreprintExist(id)))

export const resolvePreprintId = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ resolvePreprintId }: ResolvePreprintIdEnv) => resolvePreprintId(id)))

export const getPreprintId = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintId }: GetPreprintIdEnv) => getPreprintId(id)))

export const getPreprint = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprint }: GetPreprintEnv) => getPreprint(id)))

export const getPreprintTitle = (
  id: IndeterminatePreprintId,
): RTE.ReaderTaskEither<GetPreprintTitleEnv, PreprintIsNotFound | PreprintIsUnavailable, PreprintTitle> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintTitle }) => getPreprintTitle(id)))
