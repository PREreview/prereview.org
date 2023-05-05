import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { LanguageCode } from 'iso-639-1'
import { Html } from '../html'
import { IndeterminatePreprintId, PreprintId } from '../preprint-id'

export type PreprintTitle = {
  id: PreprintId
  language: LanguageCode
  title: Html
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (id: IndeterminatePreprintId) => TE.TaskEither<'not-found' | 'unavailable', PreprintTitle>
}

export const getPreprintTitle = (id: IndeterminatePreprintId) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintTitle }: GetPreprintTitleEnv) => getPreprintTitle(id)))
