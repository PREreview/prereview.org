import * as b from 'fp-ts/boolean'
import { pipe } from 'fp-ts/function'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { canEditProfile } from './feature-flags'
import { notFound, serviceUnavailable } from './middleware'

export const changeCareerStage = pipe(
  RM.rightReader(canEditProfile),
  RM.ichainW(
    b.match(
      () => notFound,
      () => serviceUnavailable,
    ),
  ),
)
