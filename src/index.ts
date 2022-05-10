import { createTerminus } from '@godaddy/terminus'
import { SystemClock } from 'clock-ts'
import express from 'express'
import * as RTC from 'fp-ts-contrib/ReaderTask'
import * as C from 'fp-ts/Console'
import { pipe } from 'fp-ts/function'
import fs from 'fs/promises'
import http from 'http'
import { toRequestHandler } from 'hyper-ts/lib/express'
import * as L from 'logger-fp-ts'
import path from 'path'
import { appMiddleware } from './app'

type AppEnv = L.LoggerEnv

const deps: AppEnv = {
  clock: SystemClock,
  logger: pipe(C.log, L.withShow(L.getColoredShow(L.ShowLogEntry))),
}

const app = express()
  .disable('x-powered-by')
  .use((req, res, next) => {
    pipe({ method: req.method, url: req.url }, L.infoP('Received HTTP request'))(deps)()

    res.once('finish', () => {
      pipe({ status: res.statusCode }, L.infoP('Sent HTTP response'))(deps)()
    })

    res.once('close', () => {
      if (res.writableFinished) {
        return
      }

      pipe({ status: res.statusCode }, L.warnP('HTTP response may not have been completely sent'))(deps)()
    })

    next()
  })
  .use(async (req, res, next) => {
    const file = req.url + '.html'
    await fs
      .access(path.join('static', file))
      .then(() => (req.url = file))
      .catch(() => {
        // do nothing
      })

    next()
  })
  .use(express.static('static'))
  .use(pipe(appMiddleware, toRequestHandler))

const server = http.createServer(app)

server.on('listening', () => {
  L.debug('Server listening')(deps)()
})

createTerminus(server, {
  onShutdown: RTC.fromReaderIO(L.debug('Shutting server down'))(deps),
  onSignal: RTC.fromReaderIO(L.debug('Signal received'))(deps),
  signals: ['SIGINT', 'SIGTERM'],
})

server.listen(3000)
