import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { PublishedCommentWithAuthor } from '../../Domain/Comments/index.ts'

export interface GetCommentsEnv {
  getComments: (prereviewId: number) => TE.TaskEither<'unavailable', ReadonlyArray<PublishedCommentWithAuthor>>
}

export const getComments = (
  prereviewId: number,
): RTE.ReaderTaskEither<GetCommentsEnv, 'unavailable', ReadonlyArray<PublishedCommentWithAuthor>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getComments }) => getComments(prereviewId)))
