import * as b from 'fp-ts/boolean'
import { pipe } from 'fp-ts/function'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { canSeeClubs } from './feature-flags'
import { notFound, serviceUnavailable } from './middleware'

export const club = pipe(
  RM.rightReader(canSeeClubs),
  RM.ichainW(
    b.match(
      () => notFound,
      () => serviceUnavailable,
    ),
  ),
)
