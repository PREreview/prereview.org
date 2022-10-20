import express from 'express'
import * as P from 'fp-ts-routing'
import * as M from 'fp-ts/Monoid'
import * as R from 'fp-ts/Reader'
import { constant, flip, pipe } from 'fp-ts/function'
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
import { CanAddAuthorsEnv } from './feature-flags'
import { home } from './home'
import { handleError } from './http-error'
import {
  createRecordOnZenodo,
  getPreprint,
  getPreprintTitle,
  getPrereview,
  getPrereviews,
  logFetch,
} from './infrastructure'
import { LegacyPrereviewApiEnv, getPseudonymFromLegacyPrereview } from './legacy-prereview'
import { PublicUrlEnv, authenticate, logIn } from './log-in'
import { PhaseEnv } from './page'
import { preprint } from './preprint'
import { review } from './review'
import {
  homeMatch,
  logInMatch,
  orcidCodeMatch,
  preprintMatch,
  reviewMatch,
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewPostMatch,
  writeReviewRemoveAuthorMatch,
  writeReviewReviewMatch,
} from './routes'
import {
  FormStoreEnv,
  writeReview,
  writeReviewAddAuthor,
  writeReviewAddAuthors,
  writeReviewAuthors,
  writeReviewCompetingInterests,
  writeReviewConduct,
  writeReviewPersona,
  writeReviewPost,
  writeReviewRemoveAuthor,
  writeReviewReview,
} from './write-review'

export type AppEnv = CanAddAuthorsEnv &
  FormStoreEnv &
  LegacyPrereviewApiEnv &
  L.LoggerEnv &
  OAuthEnv &
  PhaseEnv &
  PublicUrlEnv &
  SessionEnv &
  ZenodoAuthenticatedEnv

export const router: P.Parser<RM.ReaderMiddleware<AppEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      homeMatch.parser,
      P.map(() => home),
    ),
    pipe(
      logInMatch.parser,
      P.map(() => logIn),
    ),
    pipe(
      orcidCodeMatch.parser,
      P.map(({ code, state }) => authenticate(code, state)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPseudonym: flip(getPseudonymFromLegacyPrereview)(env),
        })),
      ),
    ),
    pipe(
      preprintMatch.parser,
      P.map(({ doi }) => preprint(doi)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPreprint: flip(getPreprint)(env),
          getPrereviews: flip(getPrereviews)(env),
        })),
      ),
    ),
    pipe(
      reviewMatch.parser,
      P.map(({ id }) => review(id)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPrereview: flip(getPrereview)({ ...env, getPreprintTitle: flip(getPreprintTitle)(env) }),
        })),
      ),
    ),
    pipe(
      [
        pipe(
          writeReviewMatch.parser,
          P.map(({ doi }) => writeReview(doi)),
        ),
        pipe(
          writeReviewReviewMatch.parser,
          P.map(({ doi }) => writeReviewReview(doi)),
        ),
        pipe(
          writeReviewPersonaMatch.parser,
          P.map(({ doi }) => writeReviewPersona(doi)),
        ),
        pipe(
          writeReviewAuthorsMatch.parser,
          P.map(({ doi }) => writeReviewAuthors(doi)),
        ),
        pipe(
          writeReviewAddAuthorMatch.parser,
          P.map(({ doi }) => writeReviewAddAuthor(doi)),
        ),
        pipe(
          writeReviewRemoveAuthorMatch.parser,
          P.map(({ doi, index }) => writeReviewRemoveAuthor(doi, index)),
        ),
        pipe(
          writeReviewAddAuthorsMatch.parser,
          P.map(({ doi }) => writeReviewAddAuthors(doi)),
        ),
        pipe(
          writeReviewCompetingInterestsMatch.parser,
          P.map(({ doi }) => writeReviewCompetingInterests(doi)),
        ),
        pipe(
          writeReviewConductMatch.parser,
          P.map(({ doi }) => writeReviewConduct(doi)),
        ),
        pipe(
          writeReviewPostMatch.parser,
          P.map(({ doi }) => writeReviewPost(doi)),
        ),
      ],
      M.concatAll(P.getParserMonoid()),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPreprintTitle: flip(getPreprintTitle)(env),
          postPrereview: flip(createRecordOnZenodo)(env),
        })),
      ),
    ),
  ],
  M.concatAll(P.getParserMonoid()),
  P.map(R.local(logFetch)),
)

const routerMiddleware = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)

const appMiddleware = pipe(routerMiddleware, RM.orElseW(handleError))

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
