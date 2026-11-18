import { Effect, Struct } from 'effect'
import { LanguageDetection } from '../../../ExternalInteractions/index.ts'
import { Prereviewers } from '../../Prereviewers/index.ts'
import type { PublishedComment } from './ListPublishedComments.ts'
import type { PublishedCommentWithAuthor } from './Types.ts'

export const Enrich = Effect.fn('Comments.getPublishedCommentsForAPrereview.Enrich')(function* (
  comment: PublishedComment,
) {
  const { author, language } = yield* Effect.all(
    {
      author: Prereviewers.getPersona({ orcidId: comment.authorId, persona: comment.persona }),
      language: LanguageDetection.detectLanguage(comment.comment),
    },
    { concurrency: 'unbounded' },
  )

  return { ...Struct.omit(comment, ['authorId', 'persona']), author, language } satisfies PublishedCommentWithAuthor
})
