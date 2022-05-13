import { constant, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { route } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { handleError } from './http-error'
import { router } from './router'

const routerMiddleware = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)

export const appMiddleware = pipe(routerMiddleware, RM.orElseMiddlewareK(handleError))
