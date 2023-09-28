import slashes from 'connect-slashes'
import cookieSignature from 'cookie-signature'
import express from 'express'
import * as P from 'fp-ts-routing'
import type { Json } from 'fp-ts/Json'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { constant, flow, identity, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import helmet from 'helmet'
import http from 'http'
import { NotFound } from 'http-errors'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import { route } from 'hyper-ts-routing'
import { type SessionEnv, getSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { toRequestHandler } from 'hyper-ts/express'
import * as L from 'logger-fp-ts'
import * as l from 'logging-ts/lib/IO'
import { match, P as p } from 'ts-pattern'
import * as uuid from 'uuid-ts'
import type { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import { aboutUs } from './about-us'
import { changeCareerStage } from './change-career-stage'
import { changeCareerStageVisibility } from './change-career-stage-visibility'
import { changeLanguages } from './change-languages'
import { changeLocation } from './change-location'
import { changeLocationVisibility } from './change-location-visibility'
import { changeOpenForRequests } from './change-open-for-requests'
import { changeOpenForRequestsVisibility } from './change-open-for-requests-visibility'
import { changeResearchInterests } from './change-research-interests'
import { changeResearchInterestsVisibility } from './change-research-interests-visibility'
import { type CloudinaryApiEnv, getAvatarFromCloudinary } from './cloudinary'
import { clubProfile } from './club-profile'
import { clubs } from './clubs'
import { codeOfConduct } from './code-of-conduct'
import {
  type SlackOAuthEnv,
  connectSlack,
  connectSlackCode,
  connectSlackError,
  connectSlackStart,
} from './connect-slack'
import { getPreprintFromCrossref, isCrossrefPreprintDoi } from './crossref'
import { getPreprintFromDatacite, isDatacitePreprintDoi } from './datacite'
import type { CanConnectSlackEnv } from './feature-flags'
import { collapseRequests, logFetch, useStaleCache } from './fetch'
import { findAPreprint } from './find-a-preprint'
import { funding } from './funding'
import type { GhostApiEnv } from './ghost'
import { home } from './home'
import { handleError } from './http-error'
import {
  type CareerStageStoreEnv,
  type IsOpenForRequestsStoreEnv,
  type LanguagesStoreEnv,
  type LocationStoreEnv,
  type ResearchInterestsStoreEnv,
  type SlackUserIdStoreEnv,
  deleteCareerStage,
  deleteLanguages,
  deleteLocation,
  deleteResearchInterests,
  getCareerStage,
  getLanguages,
  getLocation,
  getResearchInterests,
  getSlackUserId,
  isOpenForRequests,
  saveCareerStage,
  saveLanguages,
  saveLocation,
  saveOpenForRequests,
  saveResearchInterests,
  saveSlackUserId,
} from './keyv'
import {
  type LegacyPrereviewApiEnv,
  createPrereviewOnLegacyPrereview,
  getPreprintIdFromLegacyPreviewUuid,
  getProfileIdFromLegacyPreviewUuid,
  getPseudonymFromLegacyPrereview,
  getRapidPreviewsFromLegacyPrereview,
  isLegacyCompatiblePreprint,
  isLegacyCompatiblePrereview,
} from './legacy-prereview'
import { legacyRoutes } from './legacy-routes'
import { liveReviews } from './live-reviews'
import { authenticate, authenticateError, logIn, logOut } from './log-in'
import { myDetails } from './my-details'
import { getNameFromOrcid } from './orcid'
import { type FathomEnv, type PhaseEnv, type TemplatePageEnv, page } from './page'
import { partners } from './partners'
import { getPreprintFromPhilsci } from './philsci'
import type { DoesPreprintExistEnv, GetPreprintEnv, GetPreprintTitleEnv } from './preprint'
import type { IndeterminatePreprintId, PreprintId } from './preprint-id'
import { preprintReviews } from './preprint-reviews'
import { privacyPolicy } from './privacy-policy'
import { profile } from './profile-page'
import type { PublicUrlEnv } from './public-url'
import { review } from './review'
import { reviewAPreprint } from './review-a-preprint'
import { reviews } from './reviews'
import {
  aboutUsMatch,
  changeCareerStageMatch,
  changeCareerStageVisibilityMatch,
  changeLanguagesMatch,
  changeLocationMatch,
  changeLocationVisibilityMatch,
  changeOpenForRequestsMatch,
  changeOpenForRequestsVisibilityMatch,
  changeResearchInterestsMatch,
  changeResearchInterestsVisibilityMatch,
  clubProfileMatch,
  clubsMatch,
  codeOfConductMatch,
  connectSlackCodeMatch,
  connectSlackErrorMatch,
  connectSlackMatch,
  connectSlackStartMatch,
  findAPreprintMatch,
  fundingMatch,
  homeMatch,
  liveReviewsMatch,
  logInMatch,
  logOutMatch,
  myDetailsMatch,
  orcidCodeMatch,
  orcidErrorMatch,
  partnersMatch,
  preprintReviewsMatch,
  privacyPolicyMatch,
  profileMatch,
  reviewAPreprintMatch,
  reviewMatch,
  reviewsMatch,
  trainingsMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewIntroductionMatchesMatch,
  writeReviewLanguageEditingMatch,
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewNovelMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewPublishedMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
  writeReviewStartMatch,
} from './routes'
import { type SlackApiEnv, getUserFromSlack } from './slack'
import { trainings } from './trainings'
import { type GetUserEnv, getUserFromSession } from './user'
import {
  type FormStoreEnv,
  type NewPrereview,
  writeReview,
  writeReviewAddAuthors,
  writeReviewAuthors,
  writeReviewCompetingInterests,
  writeReviewConduct,
  writeReviewDataPresentation,
  writeReviewFindingsNextSteps,
  writeReviewIntroductionMatches,
  writeReviewLanguageEditing,
  writeReviewMethodsAppropriate,
  writeReviewNovel,
  writeReviewPersona,
  writeReviewPublish,
  writeReviewPublished,
  writeReviewReadyFullReview,
  writeReviewResultsSupported,
  writeReviewReview,
  writeReviewReviewType,
  writeReviewShouldRead,
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

export type AppEnv = CareerStageStoreEnv &
  CloudinaryApiEnv &
  FathomEnv &
  FormStoreEnv &
  GhostApiEnv &
  IsOpenForRequestsStoreEnv &
  LanguagesStoreEnv &
  LegacyPrereviewApiEnv &
  LocationStoreEnv &
  L.LoggerEnv &
  OAuthEnv &
  PhaseEnv &
  PublicUrlEnv &
  ResearchInterestsStoreEnv &
  SessionEnv &
  SlackApiEnv &
  SlackOAuthEnv &
  SlackUserIdStoreEnv &
  ZenodoAuthenticatedEnv & {
    allowSiteCrawlers: boolean
  } & CanConnectSlackEnv

type RouterEnv = AppEnv & DoesPreprintExistEnv & GetPreprintEnv & GetPreprintTitleEnv & GetUserEnv & TemplatePageEnv

const router: P.Parser<RM.ReaderMiddleware<RouterEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      homeMatch.parser,
      P.map(({ message }) => home(message)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getRecentPrereviews: withEnv(
            () =>
              pipe(
                getRecentPrereviewsFromZenodo(1),
                RTE.matchW(
                  () => RA.empty,
                  ({ recentPrereviews }) => recentPrereviews,
                ),
              ),
            env,
          ),
        })),
      ),
    ),
    pipe(
      reviewsMatch.parser,
      P.map(({ page }) => reviews(page)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getRecentPrereviews: withEnv(getRecentPrereviewsFromZenodo, env),
        })),
      ),
    ),
    pipe(
      aboutUsMatch.parser,
      P.map(() => aboutUs),
    ),
    pipe(
      codeOfConductMatch.parser,
      P.map(() => codeOfConduct),
    ),
    pipe(
      clubsMatch.parser,
      P.map(() => clubs),
    ),
    pipe(
      fundingMatch.parser,
      P.map(() => funding),
    ),
    pipe(
      trainingsMatch.parser,
      P.map(() => trainings),
    ),
    pipe(
      partnersMatch.parser,
      P.map(() => partners),
    ),
    pipe(
      liveReviewsMatch.parser,
      P.map(() => liveReviews),
    ),
    pipe(
      privacyPolicyMatch.parser,
      P.map(() => privacyPolicy),
    ),
    pipe(
      findAPreprintMatch.parser,
      P.map(() => findAPreprint),
    ),
    pipe(
      reviewAPreprintMatch.parser,
      P.map(() => reviewAPreprint),
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
          getPseudonym: withEnv(getPseudonymFromLegacyPrereview, env),
        })),
      ),
    ),
    pipe(
      orcidErrorMatch.parser,
      P.map(({ error }) => authenticateError(error)),
    ),
    pipe(
      connectSlackMatch.parser,
      P.map(() => connectSlack),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          isSlackUser: withEnv(isSlackUser, env),
        })),
      ),
    ),
    pipe(
      connectSlackStartMatch.parser,
      P.map(() => connectSlackStart),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          generateUuid: uuid.v4(),
          signValue: value => cookieSignature.sign(value, env.secret),
        })),
      ),
    ),
    pipe(
      connectSlackCodeMatch.parser,
      P.map(({ code, state }) => connectSlackCode(code, state)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          saveSlackUserId: withEnv(saveSlackUserId, env),
          unsignValue: value => O.fromPredicate(isString)(cookieSignature.unsign(value, env.secret)),
        })),
      ),
    ),
    pipe(
      connectSlackErrorMatch.parser,
      P.map(({ error }) => connectSlackError(error)),
    ),
    pipe(
      preprintReviewsMatch.parser,
      P.map(({ id }) => preprintReviews(id)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereviews: withEnv(getPrereviewsForPreprintFromZenodo, env),
          getRapidPrereviews: withEnv(getRapidPrereviews, env),
        })),
      ),
    ),
    pipe(
      reviewMatch.parser,
      P.map(({ id }) => review(id)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereview: withEnv(getPrereviewFromZenodo, env),
        })),
      ),
    ),
    pipe(
      myDetailsMatch.parser,
      P.map(() => myDetails),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getCareerStage: withEnv(getCareerStage, env),
          getLocation: withEnv(getLocation, env),
          getResearchInterests: withEnv(getResearchInterests, env),
          getSlackUser: withEnv(getSlackUser, env),
          isOpenForRequests: withEnv(isOpenForRequests, env),
        })),
      ),
    ),
    pipe(
      changeCareerStageMatch.parser,
      P.map(() => changeCareerStage),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteCareerStage: withEnv(deleteCareerStage, env),
          getCareerStage: withEnv(getCareerStage, env),
          saveCareerStage: withEnv(saveCareerStage, env),
        })),
      ),
    ),
    pipe(
      changeCareerStageVisibilityMatch.parser,
      P.map(() => changeCareerStageVisibility),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteCareerStage: withEnv(deleteCareerStage, env),
          getCareerStage: withEnv(getCareerStage, env),
          saveCareerStage: withEnv(saveCareerStage, env),
        })),
      ),
    ),
    pipe(
      changeOpenForRequestsMatch.parser,
      P.map(() => changeOpenForRequests),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          isOpenForRequests: withEnv(isOpenForRequests, env),
          saveOpenForRequests: withEnv(saveOpenForRequests, env),
        })),
      ),
    ),
    pipe(
      changeOpenForRequestsVisibilityMatch.parser,
      P.map(() => changeOpenForRequestsVisibility),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          isOpenForRequests: withEnv(isOpenForRequests, env),
          saveOpenForRequests: withEnv(saveOpenForRequests, env),
        })),
      ),
    ),
    pipe(
      changeResearchInterestsMatch.parser,
      P.map(() => changeResearchInterests),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteResearchInterests: withEnv(deleteResearchInterests, env),
          getResearchInterests: withEnv(getResearchInterests, env),
          saveResearchInterests: withEnv(saveResearchInterests, env),
        })),
      ),
    ),
    pipe(
      changeResearchInterestsVisibilityMatch.parser,
      P.map(() => changeResearchInterestsVisibility),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteResearchInterests: withEnv(deleteResearchInterests, env),
          getResearchInterests: withEnv(getResearchInterests, env),
          saveResearchInterests: withEnv(saveResearchInterests, env),
        })),
      ),
    ),
    pipe(
      changeLocationMatch.parser,
      P.map(() => changeLocation),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteLocation: withEnv(deleteLocation, env),
          getLocation: withEnv(getLocation, env),
          saveLocation: withEnv(saveLocation, env),
        })),
      ),
    ),
    pipe(
      changeLanguagesMatch.parser,
      P.map(() => changeLanguages),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteLanguages: withEnv(deleteLanguages, env),
          getLanguages: withEnv(getLanguages, env),
          saveLanguages: withEnv(saveLanguages, env),
        })),
      ),
    ),
    pipe(
      changeLocationVisibilityMatch.parser,
      P.map(() => changeLocationVisibility),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteLocation: withEnv(deleteLocation, env),
          getLocation: withEnv(getLocation, env),
          saveLocation: withEnv(saveLocation, env),
        })),
      ),
    ),
    pipe(
      profileMatch.parser,
      P.map(({ profile: profileId }) => profile(profileId)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAvatar: withEnv(getAvatarFromCloudinary, env),
          getCareerStage: withEnv(getCareerStage, env),
          getLocation: withEnv(getLocation, env),
          getName: withEnv(getNameFromOrcid, env),
          getPrereviews: withEnv(getPrereviewsForProfileFromZenodo, env),
          getResearchInterests: withEnv(getResearchInterests, env),
          getSlackUser: withEnv(getSlackUser, env),
          isOpenForRequests: withEnv(isOpenForRequests, env),
        })),
      ),
    ),
    pipe(
      clubProfileMatch.parser,
      P.map(({ id }) => clubProfile(id)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereviews: withEnv(getPrereviewsForClubFromZenodo, env),
        })),
      ),
    ),
    pipe(
      writeReviewMatch.parser,
      P.map(({ id }) => writeReview(id)),
    ),
    pipe(
      writeReviewStartMatch.parser,
      P.map(({ id }) => writeReviewStart(id)),
    ),
    pipe(
      writeReviewReviewTypeMatch.parser,
      P.map(({ id }) => writeReviewReviewType(id)),
    ),
    pipe(
      writeReviewReviewMatch.parser,
      P.map(({ id }) => writeReviewReview(id)),
    ),
    pipe(
      writeReviewIntroductionMatchesMatch.parser,
      P.map(({ id }) => writeReviewIntroductionMatches(id)),
    ),
    pipe(
      writeReviewMethodsAppropriateMatch.parser,
      P.map(({ id }) => writeReviewMethodsAppropriate(id)),
    ),
    pipe(
      writeReviewResultsSupportedMatch.parser,
      P.map(({ id }) => writeReviewResultsSupported(id)),
    ),
    pipe(
      writeReviewDataPresentationMatch.parser,
      P.map(({ id }) => writeReviewDataPresentation(id)),
    ),
    pipe(
      writeReviewFindingsNextStepsMatch.parser,
      P.map(({ id }) => writeReviewFindingsNextSteps(id)),
    ),
    pipe(
      writeReviewNovelMatch.parser,
      P.map(({ id }) => writeReviewNovel(id)),
    ),
    pipe(
      writeReviewLanguageEditingMatch.parser,
      P.map(({ id }) => writeReviewLanguageEditing(id)),
    ),
    pipe(
      writeReviewShouldReadMatch.parser,
      P.map(({ id }) => writeReviewShouldRead(id)),
    ),
    pipe(
      writeReviewReadyFullReviewMatch.parser,
      P.map(({ id }) => writeReviewReadyFullReview(id)),
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
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          publishPrereview: withEnv(publishPrereview, env),
        })),
      ),
    ),
    pipe(
      writeReviewPublishedMatch.parser,
      P.map(({ id }) => writeReviewPublished(id)),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

const getRapidPrereviews = (id: PreprintId) =>
  isLegacyCompatiblePreprint(id) ? getRapidPreviewsFromLegacyPrereview(id) : RTE.right([])

const publishPrereview = (newPrereview: NewPrereview) =>
  pipe(
    createRecordOnZenodo(newPrereview),
    RTE.chainFirstW(
      isLegacyCompatiblePrereview(newPrereview)
        ? flow(([doi]) => doi, createPrereviewOnLegacyPrereview(newPrereview))
        : () => RTE.right(undefined),
    ),
  )

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

const isSlackUser = flow(
  getSlackUserId,
  RTE.map(() => true),
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(false))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

const getSlackUser = flow(getSlackUserId, RTE.chainW(getUserFromSlack))

const getUser = pipe(getSession(), RM.chainOptionKW(() => 'no-session' as const)(getUserFromSession))

const routerMiddleware = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)

const appMiddleware: RM.ReaderMiddleware<AppEnv, StatusOpen, ResponseEnded, never, void> = pipe(
  routerMiddleware,
  RM.orElseW(() =>
    pipe(
      legacyRoutes,
      R.local((env: RouterEnv) => ({
        ...env,
        getPreprintIdFromUuid: withEnv(getPreprintIdFromLegacyPreviewUuid, env),
        getProfileIdFromUuid: withEnv(getProfileIdFromLegacyPreviewUuid, env),
      })),
    ),
  ),
  RM.orElseW(handleError),
  R.local(
    (env: AppEnv): RouterEnv => ({
      ...env,
      doesPreprintExist: withEnv(doesPreprintExist, env),
      getUser: withEnv(() => getUser, env),
      getPreprint: withEnv(getPreprint, env),
      getPreprintTitle: withEnv(getPreprintTitle, env),
      templatePage: withEnv(page, env),
    }),
  ),
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
