import * as C from 'fp-ts/Console'
import * as E from 'fp-ts/Either'
import * as IOE from 'fp-ts/IOEither'
import { flow, pipe } from 'fp-ts/function'
import { split } from 'fp-ts/string'
import * as D from 'io-ts/Decoder'
import { isOrcid } from 'orcid-id-ts'
import { rawHtml } from './html'

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

const HtmlD = pipe(D.string, D.map(rawHtml))

const UndefinedD: D.Decoder<unknown, undefined> = {
  decode: val => (val === undefined ? D.success(undefined) : D.failure(val, 'undefined')),
}

const EnvD = pipe(
  D.struct({
    ALLOW_SITE_CRAWLERS: withDefault(BooleanD, false),
    CAN_RAPID_REVIEW: withDefault(pipe(D.string, D.map(split(',')), D.compose(D.array(OrcidD))), []),
    GHOST_API_KEY: D.string,
    LEGACY_PREREVIEW_API_APP: D.string,
    LEGACY_PREREVIEW_API_KEY: D.string,
    LEGACY_PREREVIEW_URL: UrlD,
    LEGACY_PREREVIEW_UPDATE: withDefault(BooleanD, false),
    ORCID_CLIENT_ID: D.string,
    ORCID_CLIENT_SECRET: D.string,
    PUBLIC_URL: UrlD,
    SECRET: D.string,
    ZENODO_API_KEY: D.string,
    ZENODO_URL: UrlD,
  }),
  D.intersect(
    D.partial({
      FATHOM_SITE_ID: D.string,
      LOG_FORMAT: D.literal('json'),
      PHASE_TAG: D.string,
      PHASE_TEXT: HtmlD,
      REDIS_URI: UrlD,
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
