import { Data } from 'effect'

export class GhostPageNotFound extends Data.TaggedError('GhostPageNotFound')<{ cause?: unknown }> {}

export class GhostPageUnavailable extends Data.TaggedError('GhostPageUnavailable')<{ cause?: unknown }> {}
