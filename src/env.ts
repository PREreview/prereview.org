import { flow, pipe } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import * as IOE from 'fp-ts/lib/IOEither.js'
import * as D from 'io-ts/lib/Decoder.js'

export type EnvVars = D.TypeOf<typeof EnvD>

export function decodeEnv(process: NodeJS.Process) {
  return pipe(
    process.env,
    IOE.fromEitherK(EnvD.decode),
    IOE.orElseFirstIOK(flow(D.draw, C.log)),
    IOE.getOrElse(() => process.exit(1)),
  )
}

const EnvD = D.partial({})
