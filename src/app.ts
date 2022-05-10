import { constant, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { route } from 'hyper-ts-routing'
import * as M from 'hyper-ts/lib/Middleware'
import { handleError } from './http-error'
import { router } from './router'

const routerMiddleware = pipe(route(router, constant(new NotFound())), M.iflatten)

export const appMiddleware = pipe(routerMiddleware, M.orElse(handleError))
