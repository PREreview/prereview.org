import { createTerminus } from '@godaddy/terminus'
import { SystemClock } from 'clock-ts'
import * as RTC from 'fp-ts-contrib/ReaderTask'
import * as C from 'fp-ts/Console'
import * as E from 'fp-ts/Either'
import * as IOE from 'fp-ts/IOEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import fetch from 'make-fetch-happen'
import { AppEnv, app } from './app'
import { rawHtml } from './html'

export const UrlD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => new URL(s),
      () => D.error(s, 'URL'),
    ),
  ),
)

export const HtmlD = pipe(D.string, D.map(rawHtml))

const EnvD = pipe(
  D.struct({
    CACHE_PATH: D.string,
    DB_PATH: D.string,
    ORCID_CLIENT_ID: D.string,
    ORCID_CLIENT_SECRET: D.string,
    PUBLIC_URL: UrlD,
    SECRET: D.string,
    ZENODO_API_KEY: D.string,
    ZENODO_URL: UrlD,
  }),
  D.intersect(
    D.partial({
      PHASE_TAG: D.string,
      PHASE_TEXT: HtmlD,
    }),
  ),
)

const env = pipe(
  process.env,
  IOE.fromEitherK(EnvD.decode),
  IOE.orElseFirstIOK(flow(D.draw, C.log)),
  IOE.getOrElse(() => process.exit(1)),
)()

const deps: AppEnv = {
  clock: SystemClock,
  fetch: fetch.defaults({
    cachePath: env.CACHE_PATH,
    headers: {
      'User-Agent': `PREreview (${env.PUBLIC_URL.href}; mailto:engineering@prereview.org)`,
    },
  }),
  formStore: new Keyv(`sqlite://${env.DB_PATH}`, { namespace: 'forms' }),
  logger: pipe(C.log, L.withShow(L.getColoredShow(L.ShowLogEntry))),
  oauth: {
    authorizeUrl: new URL('https://orcid.org/oauth/authorize'),
    clientId: env.ORCID_CLIENT_ID,
    clientSecret: env.ORCID_CLIENT_SECRET,
    redirectUri: new URL('/orcid', env.PUBLIC_URL),
    tokenUrl: new URL('https://orcid.org/oauth/token'),
  },
  phase:
    env.PHASE_TAG && env.PHASE_TEXT
      ? {
          tag: env.PHASE_TAG,
          text: env.PHASE_TEXT,
        }
      : undefined,
  publicUrl: env.PUBLIC_URL,
  secret: env.SECRET,
  sessionStore: new Keyv(`sqlite://${env.DB_PATH}`, { namespace: 'sessions' }),
  zenodoApiKey: env.ZENODO_API_KEY,
  zenodoUrl: env.ZENODO_URL,
}

const server = app(deps)

server.on('listening', () => {
  L.debug('Server listening')(deps)()
})

createTerminus(server, {
  onShutdown: RTC.fromReaderIO(L.debug('Shutting server down'))(deps),
  onSignal: RTC.fromReaderIO(L.debug('Signal received'))(deps),
  signals: ['SIGINT', 'SIGTERM'],
})

server.listen(3000)
