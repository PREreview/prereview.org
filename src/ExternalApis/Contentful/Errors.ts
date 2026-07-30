import { Data } from 'effect'

export class ContentfulIsUnavailable extends Data.TaggedError('ContentfulIsUnavailable')<{ cause?: unknown }> {}
