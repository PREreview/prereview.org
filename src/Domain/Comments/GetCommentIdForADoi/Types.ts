import { Data } from 'effect'

export class CommentIsNotFound extends Data.TaggedError('CommentIsNotFound') {}
