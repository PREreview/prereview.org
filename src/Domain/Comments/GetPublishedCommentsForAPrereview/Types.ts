import { Data } from 'effect'
import type { Persona } from '../../Prereviewers/index.ts'
import type { PublishedComment } from './ListPublishedComments.ts'

export type PublishedCommentWithAuthor = Omit<PublishedComment, 'authorId' | 'persona'> & {
  readonly author: Persona
}

export class CommentsAreUnavailable extends Data.TaggedError('CommentsAreUnavailable')<{ cause?: unknown }> {}
