import { pipe } from 'fp-ts/function'
import { ResponseEnded, Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'

export const seeOther: <E = never>(location: string) => M.Middleware<StatusOpen, ResponseEnded, E, void> = location =>
  pipe(
    M.status(Status.SeeOther),
    M.ichain(() => M.header('Location', location)),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end()),
  )
