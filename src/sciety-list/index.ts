import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'

export const scietyList = pipe(
  RM.status(Status.Forbidden),
  RM.ichain(RM.closeHeaders),
  RM.ichain(() => RM.send('forbidden')),
)
