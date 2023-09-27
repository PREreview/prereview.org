import * as L from 'fp-ts-contrib/List'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { Middleware } from 'hyper-ts/Middleware'
import * as M from 'hyper-ts/Middleware'
import type { Action, ExpressConnection } from 'hyper-ts/express'

export function runMiddleware<I, O, E, A>(
  ma: Middleware<I, O, E, A>,
  c: ExpressConnection<I>,
): TE.TaskEither<E, ReadonlyArray<Action>> {
  return pipe(
    M.execMiddleware(ma, c),
    TE.map(connection => L.toReversedArray((connection as ExpressConnection<unknown>).actions)),
  )
}
