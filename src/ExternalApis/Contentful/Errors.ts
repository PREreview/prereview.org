import { Data } from 'effect'
import type { ContentfulErrorResponse } from './Types.ts'

export class ContentfulIsUnavailable extends Data.TaggedError('ContentfulIsUnavailable')<{
  cause?: unknown
  response?: ContentfulErrorResponse
}> {}
