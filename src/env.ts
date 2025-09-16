import { flow, pipe, String } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import * as E from 'fp-ts/lib/Either.js'
import * as IOE from 'fp-ts/lib/IOEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { v4 } from 'uuid-ts'
import { NonEmptyString, NonEmptyStringC } from './types/NonEmptyString.js'
import { isOrcidId } from './types/OrcidId.js'

export type EnvVars = D.TypeOf<typeof EnvD>

export function decodeEnv(process: NodeJS.Process) {
  return pipe(
    process.env,
    IOE.fromEitherK(EnvD.decode),
    IOE.orElseFirstIOK(flow(D.draw, C.log)),
    IOE.getOrElse(() => process.exit(1)),
  )
}

const BooleanD = pipe(
  D.literal('true', 'false'),
  D.map(value => value === 'true'),
)

const IntD = pipe(
  D.string,
  D.parse(s => {
    const n = +s

    return isNaN(n) || s.trim() === '' ? D.failure(s, 'Integer') : D.success(n)
  }),
)

const OrcidD = D.fromRefinement(isOrcidId, 'ORCID')

const UrlD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => new URL(s),
      () => D.error(s, 'URL'),
    ),
  ),
)

const CommaSeparatedListD = <A>(decoder: D.Decoder<unknown, A>) =>
  pipe(D.string, D.map(String.split(',')), D.compose(D.array(decoder)))

const UndefinedD: D.Decoder<unknown, undefined> = {
  decode: val => (val === undefined ? D.success(undefined) : D.failure(val, 'undefined')),
}

const EnvD = pipe(
  D.struct({
    ALLOW_SITE_CRAWLERS: withDefault(BooleanD, false),
    BLOCKED_USERS: withDefault(CommaSeparatedListD(OrcidD), []),
    COAR_NOTIFY_TOKEN: D.string,
    COAR_NOTIFY_URL: UrlD,
    CLOUDINARY_API_KEY: D.string,
    CLOUDINARY_API_SECRET: D.string,
    REMOVED_PREREVIEWS: withDefault(CommaSeparatedListD(IntD), []),
    SCIETY_LIST_TOKEN: withDefault(NonEmptyStringC, NonEmptyString(v4()())),
    SLACK_API_TOKEN: D.string,
    SLACK_CLIENT_ID: D.string,
    SLACK_CLIENT_SECRET: D.string,
    SLACK_UPDATE: withDefault(BooleanD, false),
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
