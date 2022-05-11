import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'

export const publishReview = pipe(
  M.status(Status.SeeOther),
  M.ichain(() => M.header('Location', '/preprints/doi-10.1101-2022.01.13.476201/success')),
  M.ichain(() => M.closeHeaders()),
  M.ichain(() => M.end()),
)
