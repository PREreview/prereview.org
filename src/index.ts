import { createTerminus } from '@godaddy/terminus'
import { SystemClock } from 'clock-ts'
import * as RTC from 'fp-ts-contrib/ReaderTask'
import * as C from 'fp-ts/Console'
import { pipe } from 'fp-ts/function'
import * as L from 'logger-fp-ts'
import { AppEnv, app } from './app'

const deps: AppEnv = {
  clock: SystemClock,
  logger: pipe(C.log, L.withShow(L.getColoredShow(L.ShowLogEntry))),
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
