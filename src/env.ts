import { flow, pipe, String } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import * as IOE from 'fp-ts/lib/IOEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { isOrcidId } from './types/OrcidId.ts'

export type EnvVars = D.TypeOf<typeof EnvD>

export function decodeEnv(process: NodeJS.Process) {
  return pipe(
    process.env,
    IOE.fromEitherK(EnvD.decode),
    IOE.orElseFirstIOK(flow(D.draw, C.log)),
    IOE.getOrElse(() => process.exit(1)),
  )
}

const OrcidD = D.fromRefinement(isOrcidId, 'ORCID')

const CommaSeparatedListD = <A>(decoder: D.Decoder<unknown, A>) =>
  pipe(D.string, D.map(String.split(',')), D.compose(D.array(decoder)))

const UndefinedD: D.Decoder<unknown, undefined> = {
  decode: val => (val === undefined ? D.success(undefined) : D.failure(val, 'undefined')),
}

const EnvD = pipe(
  D.struct({
    BLOCKED_USERS: withDefault(CommaSeparatedListD(OrcidD), []),
    SLACK_CLIENT_ID: D.string,
    SLACK_CLIENT_SECRET: D.string,
  }),
  D.intersect(
    D.partial({
      LOG_FORMAT: D.literal('json'),
    }),
  ),
)

// https://github.com/gcanti/io-ts/issues/8#issuecomment-875703401
function withDefault<T extends D.Decoder<unknown, unknown>>(
  decoder: T,
  defaultValue: D.TypeOf<T>,
): D.Decoder<D.InputOf<T>, D.TypeOf<T>> {
  return D.union(
    decoder,
    pipe(
      UndefinedD,
      D.map(() => defaultValue),
    ),
  )
}
