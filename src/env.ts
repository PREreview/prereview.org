import * as C from 'fp-ts/lib/Console.js'
import * as E from 'fp-ts/lib/Either.js'
import * as IOE from 'fp-ts/lib/IOEither.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { split } from 'fp-ts/lib/string.js'
import * as D from 'io-ts/lib/Decoder.js'
import { isOrcid } from 'orcid-id-ts'
import { v4 } from 'uuid-ts'
import { type NonEmptyString, NonEmptyStringC } from './types/string.js'

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

const OrcidD = D.fromRefinement(isOrcid, 'ORCID')

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
  pipe(D.string, D.map(split(',')), D.compose(D.array(decoder)))

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
    LEGACY_PREREVIEW_API_APP: D.string,
    LEGACY_PREREVIEW_API_KEY: D.string,
    LEGACY_PREREVIEW_URL: UrlD,
    LEGACY_PREREVIEW_UPDATE: withDefault(BooleanD, false),
    ORCID_CLIENT_ID: D.string,
    ORCID_CLIENT_SECRET: D.string,
    ORCID_URL: withDefault(UrlD, new URL('https://orcid.org/')),
    ORCID_API_URL: withDefault(UrlD, new URL('https://pub.orcid.org/')),
    REMOVED_PREREVIEWS: withDefault(CommaSeparatedListD(IntD), []),
    SCIETY_LIST_TOKEN: withDefault(NonEmptyStringC, v4()() as unknown as NonEmptyString),
    SLACK_API_TOKEN: D.string,
    SLACK_CLIENT_ID: D.string,
    SLACK_CLIENT_SECRET: D.string,
    SLACK_UPDATE: withDefault(BooleanD, false),
    ZENODO_API_KEY: D.string,
    ZENODO_URL: UrlD,
  }),
  D.intersect(
    D.partial({
      LOG_FORMAT: D.literal('json'),
      ORCID_API_READ_PUBLIC_TOKEN: D.string,
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
