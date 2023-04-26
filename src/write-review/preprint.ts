import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { LanguageCode } from 'iso-639-1'
import { Html } from '../html'
import { PreprintId } from '../preprint-id'

export type Preprint = {
  id: PreprintId
  language: LanguageCode
  title: Html
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: PreprintId['doi']) => TE.TaskEither<'not-found' | 'unavailable', Preprint>
}

export const getPreprint = (doi: PreprintId['doi']) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintTitle }: GetPreprintTitleEnv) => getPreprintTitle(doi)))
