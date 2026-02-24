import { Data } from 'effect'

export class UnableToDetectLanguage extends Data.TaggedError('UnableToDetectLanguage')<{ cause?: unknown }> {}
