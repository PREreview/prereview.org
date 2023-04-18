import express from 'express'
import * as P from 'fp-ts-routing'
import { Json } from 'fp-ts/Json'
import { concatAll } from 'fp-ts/Monoid'
import { Option } from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { Lazy, constant, flip, flow, pipe } from 'fp-ts/function'
import http from 'http'
import { NotFound } from 'http-errors'
import { ResponseEnded, Status, StatusOpen } from 'hyper-ts'
import { OAuthEnv } from 'hyper-ts-oauth'
import { route } from 'hyper-ts-routing'
import { SessionEnv, getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { toRequestHandler } from 'hyper-ts/lib/express'
import * as L from 'logger-fp-ts'
import * as l from 'logging-ts/lib/IO'
import { match } from 'ts-pattern'
import { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite'
import { collapseRequests, logFetch, useStaleCache } from './fetch'
import { findAPreprint } from './find-a-preprint'
import { home } from './home'
import { handleError } from './http-error'
import {
  LegacyPrereviewApiEnv,
  createPrereviewOnLegacyPrereview,
  getPreprintDoiFromLegacyPreviewUuid,
  getPseudonymFromLegacyPrereview,
  getRapidPreviewsFromLegacyPrereview,
} from './legacy-prereview'
import { authenticate, authenticateError, logIn, logOut } from './log-in'
import { FathomEnv, PhaseEnv } from './page'
import { preprint, redirectToPreprint } from './preprint'
import { PreprintId } from './preprint-id'
import { PublicUrlEnv } from './public-url'
import { review } from './review'
import {
  findAPreprintMatch,
  homeMatch,
  logInMatch,
  logOutMatch,
  orcidCodeMatch,
  orcidErrorMatch,
  preprintMatch,
  preprintUuidMatch,
  reviewMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAlreadyWrittenMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewPublishedMatch,
  writeReviewReviewMatch,
  writeReviewStartMatch,
} from './routes'
import { getUserFromSession } from './user'
import {
  FormStoreEnv,
  NewPrereview,
  writeReview,
  writeReviewAddAuthors,
  writeReviewAlreadyWritten,
  writeReviewAuthors,
  writeReviewCompetingInterests,
  writeReviewConduct,
  writeReviewPersona,
  writeReviewPublish,
  writeReviewPublished,
  writeReviewReview,
  writeReviewStart,
} from './write-review'
import {
  createRecordOnZenodo,
  getPrereviewFromZenodo,
  getPrereviewsFromZenodo,
  getRecentPrereviewsFromZenodo,
} from './zenodo'

export type AppEnv = FathomEnv &
  FormStoreEnv &
  LegacyPrereviewApiEnv &
  L.LoggerEnv &
  OAuthEnv &
  PhaseEnv &
  PublicUrlEnv &
  SessionEnv &
  ZenodoAuthenticatedEnv & {
    allowSiteCrawlers: boolean
  }

export const router: P.Parser<RM.ReaderMiddleware<AppEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      homeMatch.parser,
      P.map(() => home),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getRecentPrereviews: () =>
            getRecentPrereviewsFromZenodo()({
              ...env,
              getPreprintTitle: flip(getPreprintTitle)(env),
            }),
          getUser: () =>
            pipe(
              getSession(),
              chainOptionKW(() => 'no-session' as const)(getUserFromSession),
              RM.orElseW(() => RM.right(undefined)),
            )(env),
        })),
      ),
    ),
    pipe(
      findAPreprintMatch.parser,
      P.map(() => findAPreprint),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          doesPreprintExist: flow(
            flip(getPreprintTitle)(env),
            TE.map(() => true),
            TE.orElseW(error =>
              match(error)
                .with('not-found', () => TE.right(false))
                .with('unavailable', TE.left)
                .exhaustive(),
            ),
          ),
        })),
      ),
    ),
    pipe(
      logInMatch.parser,
      P.map(() => logIn),
    ),
    pipe(
      logOutMatch.parser,
      P.map(() => logOut),
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
      orcidErrorMatch.parser,
      P.map(({ error }) => authenticateError(error)),
    ),
    pipe(
      preprintMatch.parser,
      P.map(({ doi }) => preprint(doi)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPreprint: flip(getPreprint)(env),
          getPrereviews: flip(getPrereviewsFromZenodo)(env),
          getRapidPrereviews: flip(getRapidPreviewsFromLegacyPrereview)(env),
          getUser: () =>
            pipe(
              getSession(),
              chainOptionKW(() => 'no-session' as const)(getUserFromSession),
              RM.orElseW(() => RM.right(undefined)),
            )(env),
        })),
      ),
    ),
    pipe(
      preprintUuidMatch.parser,
      P.map(({ uuid }) => redirectToPreprint(uuid)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPreprintDoiFromUuid: flip(getPreprintDoiFromLegacyPreviewUuid)(env),
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
          getUser: () =>
            pipe(
              getSession(),
              chainOptionKW(() => 'no-session' as const)(getUserFromSession),
              RM.orElseW(() => RM.right(undefined)),
            )(env),
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
          writeReviewAlreadyWrittenMatch.parser,
          P.map(({ doi }) => writeReviewAlreadyWritten(doi)),
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
          writeReviewPublishMatch.parser,
          P.map(({ doi }) => writeReviewPublish(doi)),
        ),
        pipe(
          writeReviewPublishedMatch.parser,
          P.map(({ doi }) => writeReviewPublished(doi)),
        ),
      ],
      concatAll(P.getParserMonoid()),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPreprintTitle: flip(getPreprintTitle)(env),
          publishPrereview: flip((newPrereview: NewPrereview) =>
            pipe(
              createRecordOnZenodo(newPrereview),
              RTE.chainFirstW(flow(([doi]) => doi, createPrereviewOnLegacyPrereview(newPrereview))),
            ),
          )(env),
        })),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(flow(R.local(collapseRequests()), R.local(logFetch))),
)

const getPreprint = (doi: PreprintId['doi']) =>
  match(doi)
    .when(isCrossrefPreprintDoi, getPreprintFromCrossref)
    .when(isDatacitePreprintDoi, getPreprintFromDatacite)
    .exhaustive()

const getPreprintTitle = flow(
  getPreprint,
  RTE.local(useStaleCache()),
  RTE.map(preprint => ({ language: preprint.title.language, title: preprint.title.text })),
)

const routerMiddleware = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)

const appMiddleware = pipe(routerMiddleware, RM.orElseW(handleError))

export const app = (deps: AppEnv) => {
  const app = express()
    .disable('x-powered-by')
    .use((req, res, next) => {
      const requestId = req.header('Fly-Request-Id') ?? null

      pipe(
        {
          method: req.method,
          url: req.url,
          referrer: req.header('Referer') as Json,
          userAgent: req.header('User-Agent') as Json,
          requestId,
        },
        L.infoP('Received HTTP request'),
      )(deps)()

      res.once('finish', () => {
        pipe({ status: res.statusCode, requestId }, L.infoP('Sent HTTP response'))(deps)()
      })

      res.once('close', () => {
        if (res.writableFinished) {
          return
        }

        pipe({ status: res.statusCode, requestId }, L.warnP('HTTP response may not have been completely sent'))(deps)()
      })

      if (!deps.allowSiteCrawlers) {
        res.header('X-Robots-Tag', 'none, noarchive')
      }

      next()
    })
    .get('/robots.txt', (req, res) => {
      res.type('text/plain')
      res.send('User-agent: *\nAllow: /')
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
    .use((req, res, next) => {
      res.set('Cache-Control', 'no-cache, private')
      res.vary('Cookie')

      next()
    })
    .use(/^\/preprints\/arxiv-([A-z0-9.+-]+?)(?:v[0-9]+)?$/, (req, res) => {
      res.redirect(Status.MovedPermanently, `/preprints/doi-10.48550-arxiv.${req.params['0']}`)
    })
    .use((req, res, next) => {
      return pipe(
        appMiddleware({
          ...deps,
          logger: pipe(
            deps.logger,
            l.contramap(entry => ({
              ...entry,
              payload: { requestId: req.header('Fly-Request-Id') ?? null, ...entry.payload },
            })),
          ),
        }),
        toRequestHandler,
      )(req, res, next)
    })

  return http.createServer(app)
}

// https://github.com/DenisFrezzato/hyper-ts/pull/80
function chainOptionKW<E2>(
  onNone: Lazy<E2>,
): <A, B>(
  f: (a: A) => Option<B>,
) => <R, I, E1>(ma: RM.ReaderMiddleware<R, I, I, E1, A>) => RM.ReaderMiddleware<R, I, I, E1 | E2, B> {
  return f => RM.ichainMiddlewareKW((...a) => M.fromOption(onNone)(f(...a)))
}
