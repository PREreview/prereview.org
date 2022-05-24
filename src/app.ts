import express from 'express'
import * as R from 'fp-ts-routing'
import * as M from 'fp-ts/Monoid'
import { constant, pipe } from 'fp-ts/function'
import http from 'http'
import { NotFound } from 'http-errors'
import { route } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { toRequestHandler } from 'hyper-ts/lib/express'
import * as L from 'logger-fp-ts'
import { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import { home } from './home'
import { handleError } from './http-error'
import { lookupDoi } from './lookup-doi'
import { preprint } from './preprint'
import { review } from './review'
import { homeMatch, lookupDoiMatch, preprintMatch, reviewMatch, writeReviewMatch } from './routes'
import { writeReview } from './write-review'

export type AppEnv = L.LoggerEnv & ZenodoAuthenticatedEnv

export const router = pipe(
  [
    pipe(
      homeMatch.parser,
      R.map(() => RM.fromMiddleware(home)),
    ),
    pipe(
      lookupDoiMatch.parser,
      R.map(() => RM.fromMiddleware(lookupDoi)),
    ),
    pipe(
      preprintMatch.parser,
      R.map(() => preprint),
    ),
    pipe(
      reviewMatch.parser,
      R.map(({ id }) => review(id)),
    ),
    pipe(
      writeReviewMatch.parser,
      R.map(() => writeReview),
    ),
  ],
  M.concatAll(R.getParserMonoid()),
)

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
    .use(express.static('static'))
    .use(express.urlencoded({ extended: true }))
    .use(pipe(appMiddleware(deps), toRequestHandler))

  return http.createServer(app)
}
