import { Data } from 'effect'

export class PrereviewsAreUnavailable extends Data.TaggedError('PrereviewsAreUnavailable')<{ cause?: unknown }> {}
