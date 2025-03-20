import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { Context, type Effect } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import type * as CachingHttpClient from '../CachingHttpClient/index.js'
import type { Html } from '../html.js'

import PlainDate = Temporal.PlainDate

export interface Comment {
  authors: {
    named: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
  }
  doi: Doi
  id: number
  language?: LanguageCode
  license: 'CC-BY-4.0'
  published: PlainDate
  text: Html
}

export class CommentsForReview extends Context.Tag('CommentsForReview')<
  CommentsForReview,
  {
    get: (id: Doi) => Effect.Effect<ReadonlyArray<Comment>, 'unavailable'>
    invalidate: (prereviewId: number) => Effect.Effect<void, CachingHttpClient.InternalHttpCacheFailure>
  }
>() {}

export interface GetCommentsEnv {
  getComments: (id: Doi) => TE.TaskEither<'unavailable', ReadonlyArray<Comment>>
}

export const getComments = (id: Doi): RTE.ReaderTaskEither<GetCommentsEnv, 'unavailable', ReadonlyArray<Comment>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getComments }) => getComments(id)))
