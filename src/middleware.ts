import { pipe } from 'fp-ts/function'
import { NotFound, ServiceUnavailable } from 'http-errors'
import { ResponseEnded, Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import { handleError } from './http-error'

export const seeOther: <E = never>(location: string) => M.Middleware<StatusOpen, ResponseEnded, E, void> = location =>
  pipe(
    M.status(Status.SeeOther),
    M.ichain(() => M.header('Location', location)),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end()),
  )

export const notFound = handleError(new NotFound())

export const serviceUnavailable = handleError(new ServiceUnavailable())
