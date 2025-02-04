import { pipe } from 'effect'
import * as L from 'fp-ts-contrib/lib/List.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { Middleware } from 'hyper-ts/lib/Middleware.js'
import * as M from 'hyper-ts/lib/Middleware.js'
import type { Action, ExpressConnection } from 'hyper-ts/lib/express.js'

export function runMiddleware<I, O, E, A>(
  ma: Middleware<I, O, E, A>,
  c: ExpressConnection<I>,
): TE.TaskEither<E, ReadonlyArray<Action>> {
  return pipe(
    M.execMiddleware(ma, c),
    TE.map(connection => L.toReversedArray((connection as ExpressConnection<unknown>).actions)),
  )
}
