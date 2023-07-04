import slashes from 'connect-slashes'
import express from 'express'
import * as P from 'fp-ts-routing'
import type { Json } from 'fp-ts/Json'
import { concatAll } from 'fp-ts/Monoid'
import type { Option } from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import { type Lazy, constant, flip, flow, pipe } from 'fp-ts/function'
import { identity } from 'fp-ts/function'
import helmet from 'helmet'
import http from 'http'
import { NotFound } from 'http-errors'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import { route } from 'hyper-ts-routing'
import { type SessionEnv, getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { toRequestHandler } from 'hyper-ts/lib/express'
import * as L from 'logger-fp-ts'
import * as l from 'logging-ts/lib/IO'
import { match, P as p } from 'ts-pattern'
import type { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import { aboutUs } from './about-us'
import { club } from './club'
import { codeOfConduct } from './code-of-conduct'
import { communities } from './communities'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite'
import type { CanSeeClubsEnv } from './feature-flags'
import { collapseRequests, logFetch, useStaleCache } from './fetch'
import { findAPreprint } from './find-a-preprint'
import { funding } from './funding'
import type { GhostApiEnv } from './ghost'
import { home } from './home'
import { handleError } from './http-error'
import {
  type LegacyPrereviewApiEnv,
  createPrereviewOnLegacyPrereview,
  getPseudonymFromLegacyPrereview,
  getRapidPreviewsFromLegacyPrereview,
  isLegacyCompatiblePreprint,
  isLegacyCompatiblePrereview,
} from './legacy-prereview'
import { getPreprintIdFromLegacyPreviewUuid, getProfileIdFromLegacyPreviewUuid } from './legacy-prereview'
import { legacyRoutes } from './legacy-routes'
import { authenticate, authenticateError, logIn, logOut } from './log-in'
import { myDetails } from './my-details'
import { getNameFromOrcid } from './orcid'
import type { FathomEnv, PhaseEnv } from './page'
import { page } from './page'
import { partners } from './partners'
import { getPreprintFromPhilsci } from './philsci'
import type { IndeterminatePreprintId, PreprintId } from './preprint-id'
import { preprintJournalClubs } from './preprint-journal-clubs'
import { preprintReviews } from './preprint-reviews'
import { privacyPolicy } from './privacy-policy'
import { profile } from './profile'
import type { PublicUrlEnv } from './public-url'
import { review } from './review'
import { reviewAPreprint } from './review-a-preprint'
import { reviews } from './reviews'
import {
  aboutUsMatch,
  clubMatch,
  codeOfConductMatch,
  communitiesMatch,
  findAPreprintMatch,
  fundingMatch,
  homeMatch,
  logInMatch,
  logOutMatch,
  myDetailsMatch,
  orcidCodeMatch,
  orcidErrorMatch,
  partnersMatch,
  preprintJournalClubsMatch,
  preprintReviewsMatch,
  privacyPolicyMatch,
  profileMatch,
  reviewAPreprintMatch,
  reviewMatch,
  reviewsMatch,
  trainingsMatch,
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
import { trainings } from './trainings'
import { getUserFromSession } from './user'
import {
  type FormStoreEnv,
  type NewPrereview,
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
  getPrereviewsForClubFromZenodo,
  getPrereviewsForPreprintFromZenodo,
  getPrereviewsForProfileFromZenodo,
  getRecentPrereviewsFromZenodo,
} from './zenodo'

export type AppEnv = CanSeeClubsEnv &
  FathomEnv &
  FormStoreEnv &
  GhostApiEnv &
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
      P.map(({ message }) => home(message)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getRecentPrereviews: () =>
            pipe(
              getRecentPrereviewsFromZenodo(1),
              RTE.matchW(
                () => RA.empty,
                ({ recentPrereviews }) => recentPrereviews,
              ),
            )({
              ...env,
              getPreprintTitle: flow(
                flip(getPreprintTitle)(env),
                TE.mapLeft(error =>
                  match(error)
                    .with('not-a-preprint', () => 'not-found' as const)
                    .otherwise(identity),
                ),
              ),
            }),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
          templatePage: flip(page)(env),
        })),
      ),
    ),
    pipe(
      reviewsMatch.parser,
      P.map(({ page }) => reviews(page)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getRecentPrereviews: flip(getRecentPrereviewsFromZenodo)({
            ...env,
            getPreprintTitle: flow(
              flip(getPreprintTitle)(env),
              TE.mapLeft(error =>
                match(error)
                  .with('not-a-preprint', () => 'not-found' as const)
                  .otherwise(identity),
              ),
            ),
          }),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      aboutUsMatch.parser,
      P.map(() => aboutUs),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      codeOfConductMatch.parser,
      P.map(() => codeOfConduct),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      communitiesMatch.parser,
      P.map(() => communities),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      fundingMatch.parser,
      P.map(() => funding),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      trainingsMatch.parser,
      P.map(() => trainings),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      partnersMatch.parser,
      P.map(() => partners),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      preprintJournalClubsMatch.parser,
      P.map(() => preprintJournalClubs),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      privacyPolicyMatch.parser,
      P.map(() => privacyPolicy),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
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
                .with('not-a-preprint', TE.left)
                .with('unavailable', TE.left)
                .exhaustive(),
            ),
          ),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      reviewAPreprintMatch.parser,
      P.map(() => reviewAPreprint),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          doesPreprintExist: flow(
            flip(getPreprintTitle)(env),
            TE.map(() => true),
            TE.orElseW(error =>
              match(error)
                .with('not-found', () => TE.right(false))
                .with('not-a-preprint', TE.left)
                .with('unavailable', TE.left)
                .exhaustive(),
            ),
          ),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
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
      preprintReviewsMatch.parser,
      P.map(({ id }) => preprintReviews(id)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPreprint: flow(
            flip(getPreprint)(env),
            TE.mapLeft(error =>
              match(error)
                .with('not-a-preprint', () => 'not-found' as const)
                .otherwise(identity),
            ),
          ),
          getPrereviews: flip(getPrereviewsForPreprintFromZenodo)(env),
          getRapidPrereviews: flip((id: PreprintId) =>
            isLegacyCompatiblePreprint(id) ? getRapidPreviewsFromLegacyPrereview(id) : RTE.right([]),
          )(env),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
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
            getPreprint: flow(
              flip(getPreprint)(env),
              TE.mapLeft(error =>
                match(error)
                  .with('not-a-preprint', () => 'not-found' as const)
                  .otherwise(identity),
              ),
            ),
          }),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      myDetailsMatch.parser,
      P.map(() => myDetails),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          canEditProfile: false,
          /*getName: flip(getNameFromOrcid)(env),
          getPrereviews: flip(getPrereviewsForProfileFromZenodo)({
            ...env,
            getPreprintTitle: flow(
              flip(getPreprintTitle)(env),
              TE.mapLeft(error =>
                match(error)
                  .with('not-a-preprint', () => 'not-found' as const)
                  .otherwise(identity),
              ),
            ),
          }),*/
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      profileMatch.parser,
      P.map(({ profile: profileId }) => profile(profileId)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getName: flip(getNameFromOrcid)(env),
          getPrereviews: flip(getPrereviewsForProfileFromZenodo)({
            ...env,
            getPreprintTitle: flow(
              flip(getPreprintTitle)(env),
              TE.mapLeft(error =>
                match(error)
                  .with('not-a-preprint', () => 'not-found' as const)
                  .otherwise(identity),
              ),
            ),
          }),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      clubMatch.parser,
      P.map(({ id }) => club(id)),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPrereviews: flip(getPrereviewsForClubFromZenodo)({
            ...env,
            getPreprintTitle: flow(
              flip(getPreprintTitle)(env),
              TE.mapLeft(error =>
                match(error)
                  .with('not-a-preprint', () => 'not-found' as const)
                  .otherwise(identity),
              ),
            ),
          }),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
    pipe(
      [
        pipe(
          writeReviewMatch.parser,
          P.map(({ id }) => writeReview(id)),
        ),
        pipe(
          writeReviewStartMatch.parser,
          P.map(({ id }) => writeReviewStart(id)),
        ),
        pipe(
          writeReviewAlreadyWrittenMatch.parser,
          P.map(({ id }) => writeReviewAlreadyWritten(id)),
        ),
        pipe(
          writeReviewReviewMatch.parser,
          P.map(({ id }) => writeReviewReview(id)),
        ),
        pipe(
          writeReviewPersonaMatch.parser,
          P.map(({ id }) => writeReviewPersona(id)),
        ),
        pipe(
          writeReviewAuthorsMatch.parser,
          P.map(({ id }) => writeReviewAuthors(id)),
        ),
        pipe(
          writeReviewAddAuthorsMatch.parser,
          P.map(({ id }) => writeReviewAddAuthors(id)),
        ),
        pipe(
          writeReviewCompetingInterestsMatch.parser,
          P.map(({ id }) => writeReviewCompetingInterests(id)),
        ),
        pipe(
          writeReviewConductMatch.parser,
          P.map(({ id }) => writeReviewConduct(id)),
        ),
        pipe(
          writeReviewPublishMatch.parser,
          P.map(({ id }) => writeReviewPublish(id)),
        ),
        pipe(
          writeReviewPublishedMatch.parser,
          P.map(({ id }) => writeReviewPublished(id)),
        ),
      ],
      concatAll(P.getParserMonoid()),
      P.map(
        R.local((env: AppEnv) => ({
          ...env,
          getPreprint: flow(
            flip(getPreprint)(env),
            TE.mapLeft(error =>
              match(error)
                .with('not-a-preprint', () => 'not-found' as const)
                .otherwise(identity),
            ),
          ),
          getPreprintTitle: flow(
            flip(getPreprintTitle)(env),
            TE.mapLeft(error =>
              match(error)
                .with('not-a-preprint', () => 'not-found' as const)
                .otherwise(identity),
            ),
          ),
          publishPrereview: flip((newPrereview: NewPrereview) =>
            pipe(
              createRecordOnZenodo(newPrereview),
              RTE.chainFirstW(
                isLegacyCompatiblePrereview(newPrereview)
                  ? flow(([doi]) => doi, createPrereviewOnLegacyPrereview(newPrereview))
                  : () => RTE.right(undefined),
              ),
            ),
          )(env),
          getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
        })),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(flow(R.local(collapseRequests()), R.local(logFetch))),
)

const getPreprint = (id: IndeterminatePreprintId) =>
  match(id)
    .with({ type: 'philsci' }, getPreprintFromPhilsci)
    .with({ value: p.when(isCrossrefPreprintDoi) }, getPreprintFromCrossref)
    .with({ value: p.when(isDatacitePreprintDoi) }, getPreprintFromDatacite)
    .exhaustive()

const getPreprintTitle = flow(
  getPreprint,
  RTE.local(useStaleCache()),
  RTE.map(preprint => ({
    id: preprint.id,
    language: preprint.title.language,
    title: preprint.title.text,
  })),
)

const routerMiddleware = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)

const appMiddleware = pipe(
  routerMiddleware,
  RM.orElseW(() =>
    pipe(
      legacyRoutes,
      R.local((env: AppEnv) => ({
        ...env,
        getPreprintIdFromUuid: flip(getPreprintIdFromLegacyPreviewUuid)(env),
        getProfileIdFromUuid: flip(getProfileIdFromLegacyPreviewUuid)(env),
        getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
      })),
    ),
  ),
  RM.orElseW(
    flow(
      handleError,
      R.local((env: AppEnv) => ({
        ...env,
        getUser: () => pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))(env),
      })),
    ),
  ),
)

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
    .use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            'script-src': ["'self'", 'cdn.usefathom.com'],
            'img-src': ["'self'", 'data:', 'cdn.usefathom.com'],
            upgradeInsecureRequests: deps.publicUrl.protocol === 'https:' ? [] : null,
          },
        },
        crossOriginEmbedderPolicy: {
          policy: 'credentialless',
        },
        strictTransportSecurity: deps.publicUrl.protocol === 'https:',
      }),
    )
    .get('/robots.txt', (req, res) => {
      res.type('text/plain')
      res.send('User-agent: *\nAllow: /')
    })
    .use(
      express.static('dist/assets', {
        setHeaders: (res, path) => {
          if (path.match(/\.[a-z0-9]{8,}\.[A-z0-9]+(?:\.map)?$/)) {
            res.setHeader('Cache-Control', `public, max-age=${60 * 60 * 24 * 365}, immutable`)
          } else {
            res.setHeader('Cache-Control', `public, max-age=${60 * 60}, stale-while-revalidate=${60 * 60 * 24}`)
          }
        },
      }),
    )
    .use(
      '/api/v2',
      createProxyMiddleware({
        target: deps.legacyPrereviewApi.url.href,
        changeOrigin: true,
        logLevel: 'silent',
        onProxyReq: (proxyReq, req) => {
          const payload = {
            url: `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`,
            method: proxyReq.method,
            requestId: req.header('Fly-Request-Id') ?? null,
          }

          L.debugP('Sending proxy HTTP request')(payload)(deps)()

          proxyReq.once('response', response => {
            L.debugP('Received proxy HTTP response')({
              ...payload,
              status: response.statusCode as Json,
              headers: response.headers as Json,
            })(deps)()
          })

          proxyReq.once('error', error => {
            L.warnP('Did not receive a proxy HTTP response')({
              ...payload,
              error: error.message,
            })(deps)()
          })
        },
      }),
    )
    .use(slashes(false))
    .use(express.urlencoded({ extended: true }))
    .use((req, res, next) => {
      res.set('Cache-Control', 'no-cache, private')
      res.vary('Cookie')

      next()
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
