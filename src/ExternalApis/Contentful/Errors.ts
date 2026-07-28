import { Data } from 'effect'

export class ContentfulIsUnavailable extends Data.TaggedError('ContentfulIsUnavailable')<{ cause?: unknown }> {}

export class EntryIsNotFound extends Data.TaggedError('EntryIsNotFound')<{ cause?: unknown }> {}
