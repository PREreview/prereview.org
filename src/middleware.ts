import type { Formatter } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { NotFound, ServiceUnavailable } from 'http-errors'
import { type HeadersOpen, type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { handleError } from './http-error'
import { type PublicUrlEnv, toUrl } from './public-url'

export const seeOther: <E = never>(location: string) => M.Middleware<StatusOpen, ResponseEnded, E, void> = location =>
  pipe(
    M.status(Status.SeeOther),
    M.ichain(() => M.header('Location', location)),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end()),
  )

export const movedPermanently: <E = never>(
  location: string,
) => M.Middleware<StatusOpen, ResponseEnded, E, void> = location =>
  pipe(
    M.status(Status.MovedPermanently),
    M.ichain(() => M.header('Location', location)),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end()),
  )

export const notFound = handleError(new NotFound())

export const serviceUnavailable = handleError(new ServiceUnavailable())

export const getMethod = M.gets(c => c.getMethod())

export const addCanonicalLinkHeader = flow(
  <A>(formatter: Formatter<A>, a: A) => RM.rightReader<PublicUrlEnv, HeadersOpen, never, URL>(toUrl(formatter, a)),
  RM.chain(canonical => RM.header('Link', `<${canonical.href}>; rel="canonical"`)),
)
