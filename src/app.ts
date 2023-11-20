import slashes from 'connect-slashes'
import express from 'express'
import type { Json } from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { apply, flow, identity, pipe } from 'fp-ts/function'
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
import * as uuid from 'uuid-ts'
import type { CloudinaryApiEnv } from './cloudinary'
import type { SlackOAuthEnv } from './connect-slack'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite'
import type { Email } from './email'
import type { RequiresVerifiedEmailAddressEnv } from './feature-flags'
import { collapseRequests, logFetch, useStaleCache } from './fetch'
import type { GhostApiEnv } from './ghost'
import { handleError } from './http-error'
import type {
  CareerStageStoreEnv,
  ContactEmailAddressStoreEnv,
  IsOpenForRequestsStoreEnv,
  LanguagesStoreEnv,
  LocationStoreEnv,
  ResearchInterestsStoreEnv,
  SlackUserIdStoreEnv,
  UserOnboardingStoreEnv,
} from './keyv'
import {
  type LegacyPrereviewApiEnv,
  getPreprintIdFromLegacyPreviewUuid,
  getProfileIdFromLegacyPreviewUuid,
} from './legacy-prereview'
import { type LegacyEnv, legacyRoutes } from './legacy-routes'
import type { IsUserBlockedEnv } from './log-in'
import { type MailjetApiEnv, sendEmailWithMailjet } from './mailjet'
import { type NodemailerEnv, sendEmailWithNodemailer } from './nodemailer'
import { type FathomEnv, type PhaseEnv, page } from './page'
import { getPreprintFromPhilsci } from './philsci'
import type { PublicUrlEnv } from './public-url'
import { type RouterEnv, routes } from './router'
import type { ScietyListEnv } from './sciety-list'
import type { SlackApiEnv, SlackApiUpdateEnv } from './slack'
import type { IndeterminatePreprintId } from './types/preprint-id'
import { getUserFromSession } from './user'
import type { FormStoreEnv } from './write-review'
import type { WasPrereviewRemovedEnv } from './zenodo'
import type { ZenodoAuthenticatedEnv } from './zenodo-ts'

export type ConfigEnv = CareerStageStoreEnv &
  CloudinaryApiEnv &
  ContactEmailAddressStoreEnv &
  FathomEnv &
  FormStoreEnv &
  GhostApiEnv &
  IsOpenForRequestsStoreEnv &
  IsUserBlockedEnv &
  LanguagesStoreEnv &
  LegacyPrereviewApiEnv &
  LocationStoreEnv &
  L.LoggerEnv &
  (MailjetApiEnv | NodemailerEnv) &
  OAuthEnv &
  PhaseEnv &
  PublicUrlEnv &
  RequiresVerifiedEmailAddressEnv &
  ResearchInterestsStoreEnv &
  ScietyListEnv &
  SessionEnv &
  SlackApiEnv &
  SlackApiUpdateEnv &
  SlackOAuthEnv &
  SlackUserIdStoreEnv &
  UserOnboardingStoreEnv &
  WasPrereviewRemovedEnv &
  ZenodoAuthenticatedEnv & {
    allowSiteCrawlers: boolean
  }

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

const sendEmail = (email: Email) =>
  RTE.asksReaderTaskEitherW(
    (env: ConfigEnv) => () =>
      match(env)
        .with({ mailjetApi: p._ }, sendEmailWithMailjet(email))
        .with({ nodemailer: p._ }, sendEmailWithNodemailer(email))
        .exhaustive(),
  )

const getUser = pipe(getSession(), RM.chainOptionKW(() => 'no-session' as const)(getUserFromSession))

const appMiddleware: RM.ReaderMiddleware<RouterEnv & LegacyEnv, StatusOpen, ResponseEnded, never, void> = pipe(
  routes,
  RM.orElseW(() => legacyRoutes),
  RM.orElseW(handleError),
)

const withEnv =
  <R, A extends ReadonlyArray<unknown>, B>(f: (...a: A) => R.Reader<R, B>, env: R) =>
  (...a: A) =>
    f(...a)(env)

export const app = (config: ConfigEnv) => {
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
      )(config)()

      res.once('finish', () => {
        pipe({ status: res.statusCode, requestId }, L.infoP('Sent HTTP response'))(config)()
      })

      res.once('close', () => {
        if (res.writableFinished) {
          return
        }

        pipe(
          { status: res.statusCode, requestId },
          L.warnP('HTTP response may not have been completely sent'),
        )(config)()
      })

      if (!config.allowSiteCrawlers) {
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
            upgradeInsecureRequests: config.publicUrl.protocol === 'https:' ? [] : null,
          },
        },
        crossOriginEmbedderPolicy: {
          policy: 'credentialless',
        },
        strictTransportSecurity: config.publicUrl.protocol === 'https:',
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
        target: config.legacyPrereviewApi.url.href,
        changeOrigin: true,
        logLevel: 'silent',
        onProxyReq: (proxyReq, req) => {
          const payload = {
            url: `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`,
            method: proxyReq.method,
            requestId: req.header('Fly-Request-Id') ?? null,
          }

          L.debugP('Sending proxy HTTP request')(payload)(config)()

          proxyReq.once('response', response => {
            L.debugP('Received proxy HTTP response')({
              ...payload,
              status: response.statusCode as Json,
              headers: response.headers as Json,
            })(config)()
          })

          proxyReq.once('error', error => {
            L.warnP('Did not receive a proxy HTTP response')({
              ...payload,
              error: error.message,
            })(config)()
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
        appMiddleware,
        R.local((env: ConfigEnv): RouterEnv & LegacyEnv => ({
          ...env,
          doesPreprintExist: withEnv(doesPreprintExist, env),
          generateUuid: uuid.v4(),
          getUser: withEnv(() => getUser, env),
          getPreprint: withEnv(getPreprint, env),
          getPreprintTitle: withEnv(getPreprintTitle, env),
          templatePage: withEnv(page, env),
          getPreprintIdFromUuid: withEnv(getPreprintIdFromLegacyPreviewUuid, env),
          getProfileIdFromUuid: withEnv(getProfileIdFromLegacyPreviewUuid, env),
          sendEmail: withEnv(sendEmail, env),
        })),
        R.local(collapseRequests()),
        R.local(logFetch()),
        R.local(
          (appEnv: ConfigEnv): ConfigEnv => ({
            ...appEnv,
            logger: pipe(
              appEnv.logger,
              l.contramap(entry => ({
                ...entry,
                payload: { requestId: req.header('Fly-Request-Id') ?? null, ...entry.payload },
              })),
            ),
          }),
        ),
        apply(config),
        toRequestHandler,
      )(req, res, next)
    })

  return http.createServer(app)
}
