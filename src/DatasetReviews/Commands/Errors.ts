import { Data } from 'effect'

export class DatasetReviewHasNotBeenStarted extends Data.TaggedError('DatasetReviewHasNotBeenStarted') {}

export class DatasetReviewHasBeenPublished extends Data.TaggedError('DatasetReviewHasBeenPublished') {}

export class DatasetReviewIsBeingPublished extends Data.TaggedError('DatasetReviewIsBeingPublished') {}

export class DatasetReviewWasAlreadyStarted extends Data.TaggedError('DatasetReviewWasAlreadyStarted') {}
