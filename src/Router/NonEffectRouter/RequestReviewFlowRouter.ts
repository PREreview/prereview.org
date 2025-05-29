import { pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import type * as Response from '../Response.js'
import type { Env } from './index.js'

const routes: Array<P.Parser<(env: Env) => T.Task<Response.Response>>> = []

export const RequestReviewFlowRouter = pipe(routes, concatAll(P.getParserMonoid())) satisfies P.Parser<
  (env: Env) => T.Task<Response.Response>
>
