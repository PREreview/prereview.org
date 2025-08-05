import { Data } from 'effect'

export class FailedToPublishRecord extends Data.TaggedError('FailedToPublishRecord')<{
  cause?: unknown
}> {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const PublishRecord = (recordId: number) => new FailedToPublishRecord({ cause: 'not implemented' })
