import { Data } from 'effect'

export class PageNotFound extends Data.TaggedError('PageNotFound')<{ cause?: unknown }> {}
