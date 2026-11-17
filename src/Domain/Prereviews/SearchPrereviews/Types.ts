import { Data } from 'effect'

export class PrereviewsAreUnavailable extends Data.TaggedError('PrereviewsAreUnavailable')<{ cause?: unknown }> {}

export class PrereviewsPageNotFound extends Data.TaggedError('PrereviewsPageNotFound')<{ cause?: unknown }> {}
