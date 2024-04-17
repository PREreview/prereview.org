import type * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'

export const publishToPrereviewCoarNotifyInbox = (): RTE.ReaderTaskEither<F.FetchEnv, 'unavailable', void> =>
  RTE.left('unavailable')
