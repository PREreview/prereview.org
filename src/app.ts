import express from 'express'
import { constant, pipe } from 'fp-ts/function'
import fs from 'fs/promises'
import http from 'http'
import { NotFound } from 'http-errors'
import { route } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { toRequestHandler } from 'hyper-ts/lib/express'
import * as L from 'logger-fp-ts'
import path from 'path'
import { handleError } from './http-error'
import { router } from './router'

export type AppEnv = L.LoggerEnv

const routerMiddleware = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)

const appMiddleware = pipe(routerMiddleware, RM.orElseMiddlewareK(handleError))

export const app = (deps: AppEnv) => {
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
    .use(express.urlencoded({ extended: true }))
    .use(pipe(appMiddleware(deps), toRequestHandler))

  return http.createServer(app)
}
