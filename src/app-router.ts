import { Function, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import httpErrors from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'

const router: P.Parser<RM.ReaderMiddleware<unknown, StatusOpen, ResponseEnded, never, void>> = P.zero()

export const routes = pipe(route(router, Function.constant(new httpErrors.NotFound())), RM.fromMiddleware, RM.iflatten)
