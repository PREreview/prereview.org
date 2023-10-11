import slashes from 'connect-slashes'
import express from 'express'
import type { Json } from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import helmet from 'helmet'
import http from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import { type SessionEnv, getSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { toRequestHandler } from 'hyper-ts/express'
import * as L from 'logger-fp-ts'
import * as l from 'logging-ts/lib/IO'
import { match, P as p } from 'ts-pattern'
import type { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import type { CloudinaryApiEnv } from './cloudinary'
import type { SlackOAuthEnv } from './connect-slack'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite'
import type { CanChangeEmailAddressEnv, CanConnectSlackEnv } from './feature-flags'
import { collapseRequests, logFetch, useStaleCache } from './fetch'
import type { GhostApiEnv } from './ghost'
import { handleError } from './http-error'
import type {
  CareerStageStoreEnv,
  IsOpenForRequestsStoreEnv,
  LanguagesStoreEnv,
  LocationStoreEnv,
  ResearchInterestsStoreEnv,
  SlackUserIdStoreEnv,
} from './keyv'
import {
  type LegacyPrereviewApiEnv,
  getPreprintIdFromLegacyPreviewUuid,
  getProfileIdFromLegacyPreviewUuid,
} from './legacy-prereview'
import { type LegacyEnv, legacyRoutes } from './legacy-routes'
import type { IsUserBlockedEnv } from './log-in'
import { type FathomEnv, type PhaseEnv, page } from './page'
import { getPreprintFromPhilsci } from './philsci'
import type { IndeterminatePreprintId } from './preprint-id'
import type { PublicUrlEnv } from './public-url'
import { type RouterEnv, routes } from './router'
import type { ScietyListEnv } from './sciety-list'
import type { SlackApiEnv, SlackApiUpdateEnv } from './slack'
import { getUserFromSession } from './user'
import type { FormStoreEnv } from './write-review'
import type { WasPrereviewRemovedEnv } from './zenodo'

export type AppEnv = CareerStageStoreEnv &
  CloudinaryApiEnv &
  FathomEnv &
  FormStoreEnv &
  GhostApiEnv &
  IsOpenForRequestsStoreEnv &
  IsUserBlockedEnv &
  LanguagesStoreEnv &
  LegacyPrereviewApiEnv &
  LocationStoreEnv &
  L.LoggerEnv &
  OAuthEnv &
  PhaseEnv &
  PublicUrlEnv &
  ResearchInterestsStoreEnv &
  ScietyListEnv &
  SessionEnv &
  SlackApiEnv &
  SlackApiUpdateEnv &
  SlackOAuthEnv &
  SlackUserIdStoreEnv &
  WasPrereviewRemovedEnv &
  ZenodoAuthenticatedEnv & {
    allowSiteCrawlers: boolean
  } & CanConnectSlackEnv &
  CanChangeEmailAddressEnv

const getPreprintFromSource = (id: IndeterminatePreprintId) =>
  match(id)
    .with({ type: 'philsci' }, getPreprintFromPhilsci)
    .with({ value: p.when(isCrossrefPreprintDoi) }, getPreprintFromCrossref)
    .with({ value: p.when(isDatacitePreprintDoi) }, getPreprintFromDatacite)
    .exhaustive()

const getPreprint = flow(
  getPreprintFromSource,
  RTE.mapLeft(error =>
    match(error)
      .with('not-a-preprint', () => 'not-found' as const)
      .otherwise(identity),
  ),
)

const getPreprintTitle = flow(
  getPreprint,
  RTE.local(useStaleCache()),
  RTE.map(preprint => ({
    id: preprint.id,
    language: preprint.title.language,
    title: preprint.title.text,
  })),
)

const doesPreprintExist = flow(
  getPreprintFromSource,
  RTE.local(useStaleCache()),
  RTE.map(() => true),
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(false))
      .with('not-a-preprint', RTE.left)
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

const getUser = pipe(getSession(), RM.chainOptionKW(() => 'no-session' as const)(getUserFromSession))

const appMiddleware: RM.ReaderMiddleware<AppEnv, StatusOpen, ResponseEnded, never, void> = pipe(
  routes,
  RM.orElseW(() => legacyRoutes),
  RM.orElseW(handleError),
  R.local((env: AppEnv): RouterEnv & LegacyEnv => ({
    ...env,
    doesPreprintExist: withEnv(doesPreprintExist, env),
    getUser: withEnv(() => getUser, env),
    getPreprint: withEnv(getPreprint, env),
    getPreprintTitle: withEnv(getPreprintTitle, env),
    templatePage: withEnv(page, env),
    getPreprintIdFromUuid: withEnv(getPreprintIdFromLegacyPreviewUuid, env),
    getProfileIdFromUuid: withEnv(getProfileIdFromLegacyPreviewUuid, env),
  })),
  R.local(collapseRequests()),
  R.local(logFetch),
)

const withEnv =
  <R, A extends ReadonlyArray<unknown>, B>(f: (...a: A) => R.Reader<R, B>, env: R) =>
  (...a: A) =>
    f(...a)(env)

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
            'img-src': [
              "'self'",
              'data:',
              'avatars.slack-edge.com',
              'cdn.usefathom.com',
              'content.prereview.org',
              'res.cloudinary.com',
              'secure.gravatar.com',
              '*.wp.com',
            ],
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
