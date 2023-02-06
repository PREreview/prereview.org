import * as C from 'fp-ts/Console'
import * as E from 'fp-ts/Either'
import * as IOE from 'fp-ts/IOEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { rawHtml } from './html'

export function decodeEnv(process: NodeJS.Process) {
  return pipe(
    process.env,
    IOE.fromEitherK(EnvD.decode),
    IOE.orElseFirstIOK(flow(D.draw, C.log)),
    IOE.getOrElse(() => process.exit(1)),
  )
}

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

const EnvD = pipe(
  D.struct({
    CACHE_PATH: D.string,
    LEGACY_PREREVIEW_API_APP: D.string,
    LEGACY_PREREVIEW_API_KEY: D.string,
    LEGACY_PREREVIEW_URL: UrlD,
    ORCID_CLIENT_ID: D.string,
    ORCID_CLIENT_SECRET: D.string,
    PUBLIC_URL: UrlD,
    SECRET: D.string,
    ZENODO_API_KEY: D.string,
    ZENODO_URL: UrlD,
  }),
  D.intersect(
    D.partial({
      ALLOW_SITE_CRAWLERS: pipe(
        D.literal('true', 'false'),
        D.map(value => value === 'true'),
      ),
      FATHOM_SITE_ID: D.string,
      LEGACY_PREREVIEW_UPDATE: pipe(
        D.literal('true', 'false'),
        D.map(value => value === 'true'),
      ),
      LOG_FORMAT: D.literal('json'),
      PHASE_TAG: D.string,
      PHASE_TEXT: HtmlD,
      REDIS_URI: UrlD,
    }),
  ),
)
