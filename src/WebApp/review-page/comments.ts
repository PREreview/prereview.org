import type { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { type Array, Context, Data, type Effect } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../../html.ts'
import type { OrcidId } from '../../types/OrcidId.ts'

export interface Comment {
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: string; orcid?: OrcidId }>
  }
  doi: Doi
  id: number
  language?: LanguageCode
  license: 'CC-BY-4.0'
  published: Temporal.PlainDate
  text: Html
}

export class UnableToInvalidateComments extends Data.TaggedError('UnableToInvalidateComments')<{ cause: unknown }> {}

export class CommentsForReview extends Context.Tag('CommentsForReview')<
  CommentsForReview,
  {
    get: (id: Doi) => Effect.Effect<ReadonlyArray<Comment>, 'unavailable'>
    invalidate: (prereviewId: number) => Effect.Effect<void, UnableToInvalidateComments>
  }
>() {}

export interface GetCommentsEnv {
  getComments: (id: Doi) => TE.TaskEither<'unavailable', ReadonlyArray<Comment>>
}

export const getComments = (id: Doi): RTE.ReaderTaskEither<GetCommentsEnv, 'unavailable', ReadonlyArray<Comment>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getComments }) => getComments(id)))
