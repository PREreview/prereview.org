import express from 'express'
import * as R from 'fp-ts-routing'
import * as M from 'fp-ts/Monoid'
import { local } from 'fp-ts/Reader'
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
import { createRecordOnZenodo, getPreprint, getPreprintTitle } from './infrastructure'
import { PublicUrlEnv, authenticate, logIn } from './log-in'
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
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewPostMatch,
  writeReviewReviewMatch,
} from './routes'
import {
  FormStoreEnv,
  writeReview,
  writeReviewAddAuthors,
  writeReviewAuthors,
  writeReviewCompetingInterests,
  writeReviewConduct,
  writeReviewPersona,
  writeReviewPost,
  writeReviewReview,
} from './write-review'

export type AppEnv = FormStoreEnv & L.LoggerEnv & OAuthEnv & PublicUrlEnv & SessionEnv & ZenodoAuthenticatedEnv

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
      R.map(({ code, state }) => authenticate(code, state)),
    ),
    pipe(
      preprintMatch.parser,
      R.map(({ doi }) => preprint(doi)),
      R.map(local((env: AppEnv) => ({ ...env, getPreprint: flipC(getPreprint)(env) }))),
    ),
    pipe(
      reviewMatch.parser,
      R.map(({ id }) => review(id)),
      R.map(local((env: AppEnv) => ({ ...env, getPreprintTitle: flipC(getPreprintTitle)(env) }))),
    ),
    pipe(
      [
        pipe(
          writeReviewMatch.parser,
          R.map(({ doi }) => writeReview(doi)),
        ),
        pipe(
          writeReviewReviewMatch.parser,
          R.map(({ doi }) => writeReviewReview(doi)),
        ),
        pipe(
          writeReviewPersonaMatch.parser,
          R.map(({ doi }) => writeReviewPersona(doi)),
        ),
        pipe(
          writeReviewAuthorsMatch.parser,
          R.map(({ doi }) => writeReviewAuthors(doi)),
        ),
        pipe(
          writeReviewAddAuthorsMatch.parser,
          R.map(({ doi }) => writeReviewAddAuthors(doi)),
        ),
        pipe(
          writeReviewCompetingInterestsMatch.parser,
          R.map(({ doi }) => writeReviewCompetingInterests(doi)),
        ),
        pipe(
          writeReviewConductMatch.parser,
          R.map(({ doi }) => writeReviewConduct(doi)),
        ),
        pipe(
          writeReviewPostMatch.parser,
          R.map(({ doi }) => writeReviewPost(doi)),
        ),
      ],
      M.concatAll(R.getParserMonoid()),
      R.map(
        local((env: AppEnv) => ({
          ...env,
          createRecord: flipC(createRecordOnZenodo)(env),
          getPreprintTitle: flipC(getPreprintTitle)(env),
        })),
      ),
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
    .use(
      express.static('dist/assets', {
        setHeaders: (res, path) => {
          if (path.match(/\.[a-z0-9]{8,}\.[A-z0-9]+(?:\.map)?$/)) {
            res.setHeader('Cache-Control', `public, max-age=${60 * 60 * 24 * 365}, immutable`)
          }
        },
      }),
    )
    .use(express.urlencoded({ extended: true }))
    .use(pipe(appMiddleware(deps), toRequestHandler))

  return http.createServer(app)
}

// https://functionalprogramming.slack.com/archives/CPKPCAGP4/p1655736152988389?thread_ts=1655730853.886439&cid=CPKPCAGP4
const flipC =
  <A, B, C>(f: (a: A) => (b: B) => C) =>
  (b: B) =>
  (a: A): C =>
    f(a)(b)
