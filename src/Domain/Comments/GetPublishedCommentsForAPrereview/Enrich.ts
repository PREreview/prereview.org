import { Effect, Struct } from 'effect'
import { Prereviewers } from '../../Prereviewers/index.ts'
import type { PublishedComment } from './ListPublishedComments.ts'
import type { PublishedCommentWithAuthor } from './Types.ts'

export const Enrich = Effect.fn('Comments.getPublishedCommentsForAPrereview.Enrich')(function* (
  comment: PublishedComment,
) {
  const author = yield* Prereviewers.getPersona({ orcidId: comment.authorId, persona: comment.persona })

  return { ...Struct.omit(comment, ['authorId', 'persona']), author } satisfies PublishedCommentWithAuthor
})
