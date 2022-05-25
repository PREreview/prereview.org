import { createTerminus } from '@godaddy/terminus'
import { SystemClock } from 'clock-ts'
import * as RTC from 'fp-ts-contrib/ReaderTask'
import * as C from 'fp-ts/Console'
import * as IOE from 'fp-ts/IOEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import nodeFetch from 'node-fetch'
import { AppEnv, app } from './app'

const EnvD = D.struct({
  SECRET: D.string,
  ZENODO_API_KEY: D.string,
})

const env = pipe(
  process.env,
  IOE.fromEitherK(EnvD.decode),
  IOE.orElseFirstIOK(flow(D.draw, C.log)),
  IOE.getOrElse(() => process.exit(1)),
)()

const deps: AppEnv = {
  clock: SystemClock,
  fetch: nodeFetch,
  logger: pipe(C.log, L.withShow(L.getColoredShow(L.ShowLogEntry))),
  secret: env.SECRET,
  sessionStore: new Keyv(),
  zenodoApiKey: env.ZENODO_API_KEY,
  zenodoUrl: new URL('https://sandbox.zenodo.org/'),
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
