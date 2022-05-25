import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { writeReviewMatch } from './routes'
import { UserC } from './user'

export const logIn = pipe(
  RM.right({ name: 'Josiah Carberry', orcid: '0000-0002-1825-0097' }),
  RM.ichainFirst(() => RM.redirect(format(writeReviewMatch.formatter, {}))),
  RM.ichainW(flow(UserC.encode, storeSession)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainFirst(() => RM.end()),
)
