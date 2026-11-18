import { Data } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Persona } from '../../Prereviewers/index.ts'
import type { PublishedComment } from './ListPublishedComments.ts'

export type PublishedCommentWithAuthor = Omit<PublishedComment, 'authorId' | 'persona'> & {
  readonly author: Persona
  readonly language: LanguageCode
}

export class CommentsAreUnavailable extends Data.TaggedError('CommentsAreUnavailable')<{ cause?: unknown }> {}
