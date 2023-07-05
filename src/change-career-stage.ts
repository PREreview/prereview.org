import * as b from 'fp-ts/boolean'
import { pipe } from 'fp-ts/function'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { canEditProfile } from './feature-flags'
import { logInAndRedirect } from './log-in'
import { notFound, serviceUnavailable } from './middleware'
import { myDetailsMatch } from './routes'
import { getUser } from './user'

export const changeCareerStage = pipe(
  RM.rightReader(canEditProfile),
  RM.ichainW(
    b.match(
      () => notFound,
      () => showChangeCareerStage,
    ),
  ),
)

const showChangeCareerStage = pipe(
  getUser,
  RM.ichainW(() => serviceUnavailable),
  RM.orElseW(() => logInAndRedirect(myDetailsMatch.formatter, {})),
)
