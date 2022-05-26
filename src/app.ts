import express from 'express'
import * as R from 'fp-ts-routing'
import * as M from 'fp-ts/Monoid'
import { constant, pipe } from 'fp-ts/function'
import http from 'http'
import { NotFound } from 'http-errors'
import { ResponseEnded, StatusOpen } from 'hyper-ts'
import { OAuthEnv } from 'hyper-ts-oauth'
import { route } from 'hyper-ts-routing'
import { SessionEnv } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { toRequestHandler } from 'hyper-ts/lib/express'
import * as L from 'logger-fp-ts'
import { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import { home } from './home'
import { handleError } from './http-error'
import { authenticate, logIn } from './log-in'
import { lookupDoi } from './lookup-doi'
import { preprint } from './preprint'
import { review } from './review'
import {
  homeMatch,
  logInMatch,
  lookupDoiMatch,
  orcidCodeMatch,
  preprintMatch,
  reviewMatch,
  writeReviewMatch,
} from './routes'
import { writeReview } from './write-review'

export type AppEnv = L.LoggerEnv & OAuthEnv & SessionEnv & ZenodoAuthenticatedEnv

export const router: R.Parser<RM.ReaderMiddleware<AppEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      homeMatch.parser,
      R.map(() => RM.fromMiddleware(home)),
    ),
    pipe(
      logInMatch.parser,
      R.map(() => logIn),
    ),
    pipe(
      lookupDoiMatch.parser,
      R.map(() => RM.fromMiddleware(lookupDoi)),
    ),
    pipe(
      orcidCodeMatch.parser,
      R.map(({ code }) => authenticate(code)),
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
    .use(express.static('dist/assets'))
    .use(express.urlencoded({ extended: true }))
    .use(pipe(appMiddleware(deps), toRequestHandler))

  return http.createServer(app)
}
