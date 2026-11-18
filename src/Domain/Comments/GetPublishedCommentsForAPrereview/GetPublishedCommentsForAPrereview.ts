import { Context, Effect, pipe, Scope, Struct } from 'effect'
import type * as EventDispatcher from '../../../EventDispatcher.ts'
import * as Queries from '../../../Queries.ts'
import { Prereviewers } from '../../Prereviewers/index.ts'
import { ListPublishedComments, type PublishedComment } from './ListPublishedComments.ts'
import { CommentsAreUnavailable, type PublishedCommentWithAuthor } from './Types.ts'

export type GetPublishedCommentsForAPrereview = (
  prereviewId: number,
) => Effect.Effect<ReadonlyArray<PublishedCommentWithAuthor>, CommentsAreUnavailable>

export const GetPublishedCommentsForAPrereview: Effect.Effect<
  GetPublishedCommentsForAPrereview,
  never,
  EventDispatcher.EventDispatcher | Prereviewers
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<Prereviewers>(), Context.omit(Scope.Scope))

  const listPublishedComments = yield* Queries.makeStatefulQuery(ListPublishedComments)

  return (prereviewId: number) =>
    pipe(
      listPublishedComments(prereviewId),
      Effect.andThen(Effect.forEach(addAuthor, { concurrency: 'unbounded' })),
      Effect.catchTag(
        ['UnexpectedSequenceOfEvents', 'UnableToGetPersona'],
        error => new CommentsAreUnavailable({ cause: error }),
      ),
      Effect.provideContext(context),
      Effect.withSpan('Comments.getPublishedCommentsForAPrereview', { attributes: { prereviewId } }),
    )
})

const addAuthor = (comment: PublishedComment) =>
  Effect.map(
    Prereviewers.getPersona({ orcidId: comment.authorId, persona: comment.persona }),
    author => ({ ...Struct.omit(comment, ['authorId', 'persona']), author }) satisfies PublishedCommentWithAuthor,
  )
