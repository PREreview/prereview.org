import type { Temporal } from '@js-temporal/polyfill'
import type { Array } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../../html.ts'
import type { Doi } from '../../types/Doi.ts'
import type { Name } from '../../types/Name.ts'
import type { OrcidId } from '../../types/OrcidId.ts'

export interface Comment {
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: Name; orcid?: OrcidId }>
  }
  doi: Doi
  id: number
  language?: LanguageCode
  license: 'CC-BY-4.0'
  published: Temporal.PlainDate
  text: Html
}

export interface GetCommentsEnv {
  getComments: (review: { id: number; doi: Doi }) => TE.TaskEither<'unavailable', ReadonlyArray<Comment>>
}

export const getComments = (review: {
  id: number
  doi: Doi
}): RTE.ReaderTaskEither<GetCommentsEnv, 'unavailable', ReadonlyArray<Comment>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getComments }) => getComments(review)))
