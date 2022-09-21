import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { LanguageCode } from 'iso-639-1'
import { Html } from '../html'
import { PreprintId } from '../preprint-id'

export type Preprint = {
  doi: PreprintId['doi']
  language: LanguageCode
  title: Html
}

export interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: PreprintId['doi']) => TE.TaskEither<unknown, { title: Html; language: LanguageCode }>
}

export const getPreprint = (doi: PreprintId['doi']) => pipe(getPreprintTitle(doi), RTE.apS('doi', RTE.right(doi)))

const getPreprintTitle = (doi: PreprintId['doi']) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPreprintTitle }: GetPreprintTitleEnv) => getPreprintTitle(doi)))
