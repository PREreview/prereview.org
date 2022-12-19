import express from 'express'
import * as P from 'fp-ts-routing'
import * as M from 'fp-ts/Monoid'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { constant, flip, flow, pipe } from 'fp-ts/function'
import http from 'http'
import { NotFound } from 'http-errors'
import { ResponseEnded, StatusOpen } from 'hyper-ts'
import { OAuthEnv } from 'hyper-ts-oauth'
import { route } from 'hyper-ts-routing'
import { SessionEnv } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { toRequestHandler } from 'hyper-ts/lib/express'
import * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite'
import { logFetch, useStaleCache } from './fetch'
import { home } from './home'
import { handleError } from './http-error'
import {
  LegacyPrereviewApiEnv,
  createPrereviewOnLegacyPrereview,
  getPseudonymFromLegacyPrereview,
  getRapidPreviewsFromLegacyPrereview,
} from './legacy-prereview'
import { PublicUrlEnv, authenticate, logIn } from './log-in'
import { PhaseEnv } from './page'
import { preprint } from './preprint'
import { PreprintId } from './preprint-id'
import { review } from './review'
import {
  homeMatch,
  logInMatch,
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
  writeReviewStartMatch,
} from './routes'
import {
  FormStoreEnv,
  NewPrereview,
  writeReview,
  writeReviewAddAuthors,
  writeReviewAuthors,
  writeReviewCompetingInterests,
  writeReviewConduct,
  writeReviewPersona,
  writeReviewPost,
  writeReviewReview,
  writeReviewStart,
} from './write-review'
import { createRecordOnZenodo, getPrereviewFromZenodo, getPrereviewsFromZenodo } from './zenodo'

export type AppEnv = FormStoreEnv &
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
          getPrereviews: flip(getPrereviewsFromZenodo)(env),
          getRapidPrereviews: getRapidPreviewsFromLegacyPrereview,
        })),
      ),
    ),
    pipe(
      reviewMatch.parser,
      P.map(({ id }) => review(id)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPrereview: flip(getPrereviewFromZenodo)({
            ...env,
            getPreprintTitle: flip(getPreprintTitle)(env),
          }),
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
          writeReviewStartMatch.parser,
          P.map(({ doi }) => writeReviewStart(doi)),
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
          postPrereview: flip((newPrereview: NewPrereview) =>
            pipe(createRecordOnZenodo(newPrereview), RTE.chainFirstW(createPrereviewOnLegacyPrereview(newPrereview))),
          )(env),
        })),
      ),
    ),
  ],
  M.concatAll(P.getParserMonoid()),
  P.map(R.local(logFetch)),
)

const getPreprint = (doi: PreprintId['doi']) =>
  match(doi)
    .when(isCrossrefPreprintDoi, getPreprintFromCrossref)
    .when(isDatacitePreprintDoi, getPreprintFromDatacite)
    .exhaustive()

const getPreprintTitle = flow(
  getPreprint,
  RTE.local(useStaleCache),
  RTE.map(preprint => ({ language: preprint.title.language, title: preprint.title.text })),
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
