import cookieSignature from 'cookie-signature'
import * as P from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RIO from 'fp-ts/ReaderIO'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as T from 'fp-ts/Task'
import { constVoid, constant, flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { NotFound } from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import type { SessionEnv } from 'hyper-ts-session'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { fromRequestHandler } from 'hyper-ts/express'
import type * as L from 'logger-fp-ts'
import multer, { MulterError } from 'multer'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import type { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import { aboutUs } from './about-us'
import { type OpenAuthorInvite, createAuthorInvite } from './author-invite'
import {
  authorInvite,
  authorInviteCheck,
  authorInviteDecline,
  authorInviteEnterEmailAddress,
  authorInviteNeedToVerifyEmailAddress,
  authorInvitePersona,
  authorInvitePublished,
  authorInviteStart,
  authorInviteVerifyEmailAddress,
} from './author-invite-flow'
import {
  type CloudinaryApiEnv,
  getAvatarFromCloudinary,
  removeAvatarFromCloudinary,
  saveAvatarOnCloudinary,
} from './cloudinary'
import { clubProfile } from './club-profile'
import { clubs } from './clubs'
import { codeOfConduct } from './code-of-conduct'
import {
  type OrcidOAuthEnv as ConnectOrcidOAuthEnv,
  connectOrcid,
  connectOrcidCode,
  connectOrcidError,
  connectOrcidStart,
  disconnectOrcid,
} from './connect-orcid'
import {
  type SlackOAuthEnv,
  connectSlack,
  connectSlackCode,
  connectSlackError,
  connectSlackStart,
} from './connect-slack'
import { disconnectSlack } from './disconnect-slack'
import { ediaStatement } from './edia-statement'
import {
  type SendEmailEnv,
  createAuthorInviteEmail,
  createContactEmailAddressVerificationEmailForInvitedAuthor,
  sendContactEmailAddressVerificationEmail,
  sendContactEmailAddressVerificationEmailForReview,
  sendEmail,
} from './email'
import type { CanConnectOrcidProfileEnv, CanRequestReviewsEnv, CanUploadAvatarEnv } from './feature-flags'
import { funding } from './funding'
import type { GhostApiEnv } from './ghost'
import { home } from './home'
import { howToUse } from './how-to-use'
import * as Keyv from './keyv'
import {
  type LegacyPrereviewApiEnv,
  createPrereviewOnLegacyPrereview,
  getPseudonymFromLegacyPrereview,
  getRapidPreviewsFromLegacyPrereview,
  isLegacyCompatiblePreprint,
  isLegacyCompatiblePrereview,
} from './legacy-prereview'
import { liveReviews } from './live-reviews'
import { type IsUserBlockedEnv, type OrcidOAuthEnv, authenticate, authenticateError, logIn, logOut } from './log-in'
import { getMethod } from './middleware'
import {
  changeAvatar,
  changeCareerStage,
  changeCareerStageVisibility,
  changeContactEmailAddress,
  changeLanguages,
  changeLanguagesVisibility,
  changeLocation,
  changeLocationVisibility,
  changeOpenForRequests,
  changeOpenForRequestsVisibility,
  changeResearchInterests,
  changeResearchInterestsVisibility,
  myDetails,
  removeAvatar,
  verifyContactEmailAddress,
} from './my-details-page'
import { type OrcidApiEnv, getNameFromOrcid } from './orcid'
import type { FathomEnv, PhaseEnv, TemplatePageEnv } from './page'
import { partners } from './partners'
import { people } from './people'
import type { DoesPreprintExistEnv, GetPreprintEnv, GetPreprintTitleEnv } from './preprint'
import { preprintReviews } from './preprint-reviews'
import { publishToPrereviewCoarNotifyInbox } from './prereview-coar-notify'
import { privacyPolicy } from './privacy-policy'
import { profile } from './profile-page'
import type { PublicUrlEnv } from './public-url'
import { requestAPrereview } from './request-a-prereview-page'
import { requestReview, requestReviewCheck, requestReviewPublished, requestReviewStart } from './request-review-flow'
import { resources } from './resources'
import { handleResponse } from './response'
import { reviewAPreprint } from './review-a-preprint'
import { reviewPage } from './review-page'
import { reviewsPage } from './reviews-page'
import {
  aboutUsMatch,
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteMatch,
  authorInviteNeedToVerifyEmailAddressMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
  authorInviteVerifyEmailAddressMatch,
  changeAvatarMatch,
  changeCareerStageMatch,
  changeCareerStageVisibilityMatch,
  changeContactEmailAddressMatch,
  changeLanguagesMatch,
  changeLanguagesVisibilityMatch,
  changeLocationMatch,
  changeLocationVisibilityMatch,
  changeOpenForRequestsMatch,
  changeOpenForRequestsVisibilityMatch,
  changeResearchInterestsMatch,
  changeResearchInterestsVisibilityMatch,
  clubProfileMatch,
  clubsMatch,
  codeOfConductMatch,
  connectOrcidCodeMatch,
  connectOrcidErrorMatch,
  connectOrcidMatch,
  connectOrcidStartMatch,
  connectSlackCodeMatch,
  connectSlackErrorMatch,
  connectSlackMatch,
  connectSlackStartMatch,
  disconnectOrcidMatch,
  disconnectSlackMatch,
  ediaStatementMatch,
  fundingMatch,
  homeMatch,
  howToUseMatch,
  liveReviewsMatch,
  logInMatch,
  logOutMatch,
  myDetailsMatch,
  orcidCodeMatch,
  orcidErrorMatch,
  partnersMatch,
  peopleMatch,
  preprintReviewsMatch,
  privacyPolicyMatch,
  profileMatch,
  removeAvatarMatch,
  requestAPrereviewMatch,
  requestReviewCheckMatch,
  requestReviewMatch,
  requestReviewPublishedMatch,
  requestReviewStartMatch,
  resourcesMatch,
  reviewAPreprintMatch,
  reviewMatch,
  reviewsMatch,
  scietyListMatch,
  trainingsMatch,
  verifyContactEmailAddressMatch,
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewChangeAuthorMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewDataPresentationMatch,
  writeReviewEnterEmailAddressMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewIntroductionMatchesMatch,
  writeReviewLanguageEditingMatch,
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
  writeReviewNovelMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewPublishedMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewRemoveAuthorMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
  writeReviewStartMatch,
  writeReviewVerifyEmailAddressMatch,
} from './routes'
import { type ScietyListEnv, scietyList } from './sciety-list'
import {
  type SlackApiEnv,
  type SlackApiUpdateEnv,
  addOrcidToSlackProfile,
  getUserFromSlack,
  removeOrcidFromSlackProfile,
} from './slack'
import type { SlackUserId } from './slack-user-id'
import { trainings } from './trainings'
import type { PreprintId } from './types/preprint-id'
import { type GenerateUuidEnv, generateUuid } from './types/uuid'
import { type GetUserEnv, type User, maybeGetUser } from './user'
import type { GetUserOnboardingEnv } from './user-onboarding'
import {
  type FormStoreEnv,
  type NewPrereview,
  writeReview,
  writeReviewAddAuthor,
  writeReviewAddAuthors,
  writeReviewAuthors,
  writeReviewChangeAuthor,
  writeReviewCompetingInterests,
  writeReviewConduct,
  writeReviewDataPresentation,
  writeReviewEnterEmailAddress,
  writeReviewFindingsNextSteps,
  writeReviewIntroductionMatches,
  writeReviewLanguageEditing,
  writeReviewMethodsAppropriate,
  writeReviewNeedToVerifyEmailAddress,
  writeReviewNovel,
  writeReviewPersona,
  writeReviewPublish,
  writeReviewPublished,
  writeReviewReadyFullReview,
  writeReviewRemoveAuthor,
  writeReviewResultsSupported,
  writeReviewReview,
  writeReviewReviewType,
  writeReviewShouldRead,
  writeReviewStart,
  writeReviewVerifyEmailAddress,
} from './write-review'
import {
  type WasPrereviewRemovedEnv,
  addAuthorToRecordOnZenodo,
  createRecordOnZenodo,
  getPrereviewFromZenodo,
  getPrereviewsForClubFromZenodo,
  getPrereviewsForPreprintFromZenodo,
  getPrereviewsForProfileFromZenodo,
  getPrereviewsForSciety,
  getRecentPrereviewsFromZenodo,
  refreshPrereview,
} from './zenodo'

const isSlackUser = flow(
  Keyv.getSlackUserId,
  RTE.map(() => true),
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(false))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

const getSlackUser = flow(
  Keyv.getSlackUserId,
  RTE.chainW(({ userId }) => getUserFromSlack(userId)),
)

const withEnv =
  <R, A extends ReadonlyArray<unknown>, B>(f: (...a: A) => R.Reader<R, B>, env: R) =>
  (...a: A) =>
    f(...a)(env)

export type RouterEnv = Keyv.AvatarStoreEnv &
  CanConnectOrcidProfileEnv &
  CanRequestReviewsEnv &
  CanUploadAvatarEnv &
  DoesPreprintExistEnv &
  GenerateUuidEnv &
  GetPreprintEnv &
  GetPreprintTitleEnv &
  GetUserEnv &
  GetUserOnboardingEnv &
  Keyv.AuthorInviteStoreEnv &
  Keyv.CareerStageStoreEnv &
  CloudinaryApiEnv &
  ConnectOrcidOAuthEnv &
  Keyv.ContactEmailAddressStoreEnv &
  FathomEnv &
  FormStoreEnv &
  GhostApiEnv &
  Keyv.IsOpenForRequestsStoreEnv &
  IsUserBlockedEnv &
  Keyv.LanguagesStoreEnv &
  LegacyPrereviewApiEnv &
  Keyv.LocationStoreEnv &
  L.LoggerEnv &
  OrcidApiEnv &
  Keyv.OrcidTokenStoreEnv &
  OrcidOAuthEnv &
  PhaseEnv &
  PublicUrlEnv &
  Keyv.ResearchInterestsStoreEnv &
  Keyv.ReviewRequestStoreEnv &
  ScietyListEnv &
  SendEmailEnv &
  SessionEnv &
  SlackApiEnv &
  SlackApiUpdateEnv &
  SlackOAuthEnv &
  Keyv.SlackUserIdStoreEnv &
  TemplatePageEnv &
  Keyv.UserOnboardingStoreEnv &
  WasPrereviewRemovedEnv &
  ZenodoAuthenticatedEnv

const getRapidPrereviews = (id: PreprintId) =>
  isLegacyCompatiblePreprint(id) ? getRapidPreviewsFromLegacyPrereview(id) : RTE.right([])

const triggerRefreshOfPrereview = (id: number) =>
  RIO.asks((env: Parameters<ReturnType<typeof refreshPrereview>>[0]) => {
    void pipe(
      RTE.fromTask(T.delay(2000)(T.of(undefined))),
      RTE.chainW(() => refreshPrereview(id)),
    )(env)().catch(constVoid)
  })

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5_242_880 } })

const publishPrereview = (newPrereview: NewPrereview) =>
  pipe(
    createRecordOnZenodo(newPrereview),
    RTE.chainFirstW(
      isLegacyCompatiblePrereview(newPrereview)
        ? flow(([doi]) => doi, createPrereviewOnLegacyPrereview(newPrereview))
        : () => RTE.right(undefined),
    ),
    RTE.chainFirstW(([, review]) =>
      pipe(
        newPrereview.otherAuthors,
        RTE.traverseSeqArray(otherAuthor =>
          pipe(
            createAuthorInvite({ status: 'open', emailAddress: otherAuthor.emailAddress, review }),
            RTE.chainReaderKW(authorInvite =>
              createAuthorInviteEmail(otherAuthor, authorInvite, {
                ...newPrereview,
                author: match(newPrereview.persona)
                  .with('public', () => newPrereview.user.name)
                  .with('pseudonym', () => newPrereview.user.pseudonym)
                  .exhaustive(),
              }),
            ),
            RTE.chainW(sendEmail),
          ),
        ),
      ),
    ),
    RTE.chainFirstReaderIOKW(([, review]) => triggerRefreshOfPrereview(review)),
  )

const addAuthorToPrereview = (id: number, user: User, persona: 'public' | 'pseudonym') =>
  pipe(
    addAuthorToRecordOnZenodo(id, user, persona),
    RTE.chainFirstReaderIOKW(() => triggerRefreshOfPrereview(id)),
  )

const router: P.Parser<RM.ReaderMiddleware<RouterEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      homeMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(home)),
          RM.ichainW(handleResponse),
        ),
      ),
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
      P.map(({ page }) =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(reviewsPage(page))),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getRecentPrereviews: withEnv(getRecentPrereviewsFromZenodo, env),
        })),
      ),
    ),
    pipe(
      aboutUsMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(aboutUs)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      howToUseMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(howToUse)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      peopleMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(people)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      codeOfConductMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(codeOfConduct)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      ediaStatementMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(ediaStatement)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      clubsMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(clubs)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      fundingMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(funding)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      trainingsMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(trainings)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      resourcesMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(resources)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      partnersMatch.parser,
      P.map(() =>
        pipe(RM.of({}), RM.apS('user', maybeGetUser), RM.apSW('response', RM.of(partners)), RM.ichainW(handleResponse)),
      ),
    ),
    pipe(
      liveReviewsMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(liveReviews)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      privacyPolicyMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(privacyPolicy)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      reviewAPreprintMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(reviewAPreprint)),
          RM.ichainW(handleResponse),
        ),
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
        R.local((env: RouterEnv) => ({
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
      connectOrcidMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(connectOrcid)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getOrcidToken: withEnv(Keyv.getOrcidToken, env),
        })),
      ),
    ),
    pipe(
      connectOrcidStartMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(connectOrcidStart)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      connectOrcidCodeMatch.parser,
      P.map(({ code }) =>
        pipe(
          RM.of({ code }),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(connectOrcidCode)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getOrcidToken: withEnv(Keyv.getOrcidToken, env),
          saveOrcidToken: withEnv(Keyv.saveOrcidToken, env),
        })),
      ),
    ),
    pipe(
      connectOrcidErrorMatch.parser,
      P.map(({ error }) =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apS('response', RM.of(connectOrcidError({ error }))),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      disconnectOrcidMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.bindW('response', RM.fromReaderTaskK(disconnectOrcid)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteOrcidToken: withEnv(Keyv.deleteOrcidToken, env),
          getOrcidToken: withEnv(Keyv.getOrcidToken, env),
        })),
      ),
    ),
    pipe(
      connectSlackMatch.parser,
      P.map(() => connectSlack),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          canConnectSlack: () => true,
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
          canConnectSlack: () => true,
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
          saveSlackUserId: withEnv(
            (orcid: Orcid, slackUser: SlackUserId) =>
              pipe(
                Keyv.saveSlackUserId(orcid, slackUser),
                RTE.chainFirstW(() => addOrcidToSlackProfile(slackUser, orcid)),
              ),
            env,
          ),
          unsignValue: value => O.fromPredicate(isString)(cookieSignature.unsign(value, env.secret)),
        })),
      ),
    ),
    pipe(
      connectSlackErrorMatch.parser,
      P.map(({ error }) => connectSlackError(error)),
    ),
    pipe(
      disconnectSlackMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(disconnectSlack)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          canConnectSlack: () => true,
          deleteSlackUserId: withEnv(
            (orcid: Orcid) =>
              pipe(
                RTE.of(orcid),
                RTE.chainFirst(
                  flow(
                    Keyv.getSlackUserId,
                    RTE.chainW(removeOrcidFromSlackProfile),
                    RTE.orElseW(() => RTE.right(undefined)),
                  ),
                ),
                RTE.chainW(Keyv.deleteSlackUserId),
              ),
            env,
          ),
          isSlackUser: withEnv(isSlackUser, env),
        })),
      ),
    ),
    pipe(
      preprintReviewsMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', ({ user }) => RM.fromReaderTask(preprintReviews(id, user))),
          RM.ichainW(handleResponse),
        ),
      ),
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
      P.map(({ id }) =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(reviewPage(id))),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereview: withEnv(getPrereviewFromZenodo, env),
        })),
      ),
    ),
    pipe(
      myDetailsMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(myDetails)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          canConnectSlack: () => true,
          getAvatar: withEnv(getAvatarFromCloudinary, { ...env, getCloudinaryAvatar: withEnv(Keyv.getAvatar, env) }),
          getCareerStage: withEnv(Keyv.getCareerStage, env),
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          getLanguages: withEnv(Keyv.getLanguages, env),
          getLocation: withEnv(Keyv.getLocation, env),
          getOrcidToken: withEnv(Keyv.getOrcidToken, env),
          getResearchInterests: withEnv(Keyv.getResearchInterests, env),
          getSlackUser: withEnv(getSlackUser, env),
          isOpenForRequests: withEnv(Keyv.isOpenForRequests, env),
          saveUserOnboarding: withEnv(Keyv.saveUserOnboarding, env),
        })),
      ),
    ),
    pipe(
      changeAvatarMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            pipe(
              RM.fromMiddleware(
                fromRequestHandler(
                  upload.fields([{ name: 'avatar', maxCount: 1 }]),
                  req => E.right(req.files),
                  error => ({
                    avatar: error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE' ? 'TOO_BIG' : 'ERROR',
                  }),
                ),
              ),
              RM.orElseW(RM.right),
            ),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeAvatar)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          saveAvatar: withEnv(saveAvatarOnCloudinary, {
            ...env,
            getCloudinaryAvatar: withEnv(Keyv.getAvatar, env),
            saveCloudinaryAvatar: withEnv(Keyv.saveAvatar, env),
          }),
        })),
      ),
    ),
    pipe(
      removeAvatarMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(removeAvatar)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteAvatar: withEnv(removeAvatarFromCloudinary, {
            ...env,
            deleteCloudinaryAvatar: withEnv(Keyv.deleteAvatar, env),
            getCloudinaryAvatar: withEnv(Keyv.getAvatar, env),
          }),
          getAvatar: withEnv(getAvatarFromCloudinary, { ...env, getCloudinaryAvatar: withEnv(Keyv.getAvatar, env) }),
        })),
      ),
    ),
    pipe(
      changeCareerStageMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeCareerStage)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteCareerStage: withEnv(Keyv.deleteCareerStage, env),
          getCareerStage: withEnv(Keyv.getCareerStage, env),
          saveCareerStage: withEnv(Keyv.saveCareerStage, env),
        })),
      ),
    ),
    pipe(
      changeCareerStageVisibilityMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeCareerStageVisibility)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteCareerStage: withEnv(Keyv.deleteCareerStage, env),
          getCareerStage: withEnv(Keyv.getCareerStage, env),
          saveCareerStage: withEnv(Keyv.saveCareerStage, env),
        })),
      ),
    ),
    pipe(
      changeOpenForRequestsMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeOpenForRequests)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          isOpenForRequests: withEnv(Keyv.isOpenForRequests, env),
          saveOpenForRequests: withEnv(Keyv.saveOpenForRequests, env),
        })),
      ),
    ),
    pipe(
      changeOpenForRequestsVisibilityMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeOpenForRequestsVisibility)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          isOpenForRequests: withEnv(Keyv.isOpenForRequests, env),
          saveOpenForRequests: withEnv(Keyv.saveOpenForRequests, env),
        })),
      ),
    ),
    pipe(
      changeResearchInterestsMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeResearchInterests)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteResearchInterests: withEnv(Keyv.deleteResearchInterests, env),
          getResearchInterests: withEnv(Keyv.getResearchInterests, env),
          saveResearchInterests: withEnv(Keyv.saveResearchInterests, env),
        })),
      ),
    ),
    pipe(
      changeResearchInterestsVisibilityMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeResearchInterestsVisibility)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteResearchInterests: withEnv(Keyv.deleteResearchInterests, env),
          getResearchInterests: withEnv(Keyv.getResearchInterests, env),
          saveResearchInterests: withEnv(Keyv.saveResearchInterests, env),
        })),
      ),
    ),
    pipe(
      changeLocationMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeLocation)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteLocation: withEnv(Keyv.deleteLocation, env),
          getLocation: withEnv(Keyv.getLocation, env),
          saveLocation: withEnv(Keyv.saveLocation, env),
        })),
      ),
    ),
    pipe(
      changeLanguagesMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeLanguages)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteLanguages: withEnv(Keyv.deleteLanguages, env),
          getLanguages: withEnv(Keyv.getLanguages, env),
          saveLanguages: withEnv(Keyv.saveLanguages, env),
        })),
      ),
    ),
    pipe(
      changeLocationVisibilityMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeLocationVisibility)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteLocation: withEnv(Keyv.deleteLocation, env),
          getLocation: withEnv(Keyv.getLocation, env),
          saveLocation: withEnv(Keyv.saveLocation, env),
        })),
      ),
    ),
    pipe(
      changeLanguagesVisibilityMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeLanguagesVisibility)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteLanguages: withEnv(Keyv.deleteLanguages, env),
          getLanguages: withEnv(Keyv.getLanguages, env),
          saveLanguages: withEnv(Keyv.saveLanguages, env),
        })),
      ),
    ),
    pipe(
      changeContactEmailAddressMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(changeContactEmailAddress)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, env),
          verifyContactEmailAddress: withEnv(sendContactEmailAddressVerificationEmail, env),
        })),
      ),
    ),
    pipe(
      verifyContactEmailAddressMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(verifyContactEmailAddress)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, env),
        })),
      ),
    ),
    pipe(
      profileMatch.parser,
      P.map(({ profile: profileId }) =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(profile(profileId))),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAvatar: withEnv(getAvatarFromCloudinary, { ...env, getCloudinaryAvatar: withEnv(Keyv.getAvatar, env) }),
          getCareerStage: withEnv(Keyv.getCareerStage, env),
          getLanguages: withEnv(Keyv.getLanguages, env),
          getLocation: withEnv(Keyv.getLocation, env),
          getName: withEnv(getNameFromOrcid, env),
          getPrereviews: withEnv(getPrereviewsForProfileFromZenodo, env),
          getResearchInterests: withEnv(Keyv.getResearchInterests, env),
          getSlackUser: withEnv(getSlackUser, env),
          isOpenForRequests: withEnv(Keyv.isOpenForRequests, env),
        })),
      ),
    ),
    pipe(
      clubProfileMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW('response', RM.fromReaderTask(clubProfile(id))),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereviews: withEnv(getPrereviewsForClubFromZenodo, env),
        })),
      ),
    ),
    pipe(
      writeReviewMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(writeReview)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewStartMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewStart)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewReviewTypeMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewReviewType)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewReviewMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewReview)),
          RM.ichainW(handleResponse),
        ),
      ),
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
      writeReviewAddAuthorMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewAddAuthor)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewChangeAuthorMatch.parser,
      P.map(({ id, number }) =>
        pipe(
          RM.of({ id, number }),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewChangeAuthor)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewRemoveAuthorMatch.parser,
      P.map(({ id, number }) =>
        pipe(
          RM.of({ id, number }),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewRemoveAuthor)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewAddAuthorsMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewAddAuthors)),
          RM.ichainW(handleResponse),
        ),
      ),
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
      writeReviewEnterEmailAddressMatch.parser,
      P.map(({ id }) => writeReviewEnterEmailAddress(id)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, env),
          verifyContactEmailAddressForReview: withEnv(sendContactEmailAddressVerificationEmailForReview, env),
        })),
      ),
    ),
    pipe(
      writeReviewNeedToVerifyEmailAddressMatch.parser,
      P.map(({ id }) => writeReviewNeedToVerifyEmailAddress(id)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          verifyContactEmailAddressForReview: withEnv(sendContactEmailAddressVerificationEmailForReview, env),
        })),
      ),
    ),
    pipe(
      writeReviewVerifyEmailAddressMatch.parser,
      P.map(({ id, verify }) => writeReviewVerifyEmailAddress(id, verify)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, env),
        })),
      ),
    ),
    pipe(
      writeReviewPublishMatch.parser,
      P.map(({ id }) => writeReviewPublish(id)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          publishPrereview: withEnv(publishPrereview, {
            ...env,
            createAuthorInvite: withEnv(
              (authorInvite: OpenAuthorInvite) =>
                pipe(
                  RTE.rightReaderIO(generateUuid),
                  RTE.chainFirstW(uuid => Keyv.saveAuthorInvite(uuid, authorInvite)),
                ),
              env,
            ),
          }),
        })),
      ),
    ),
    pipe(
      writeReviewPublishedMatch.parser,
      P.map(({ id }) => writeReviewPublished(id)),
    ),
    pipe(
      requestAPrereviewMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderK(requestAPrereview)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      requestReviewMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ preprint: id }),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(requestReview)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getReviewRequest: (orcid, preprint) => withEnv(Keyv.getReviewRequest, env)([orcid, preprint]),
        })),
      ),
    ),
    pipe(
      requestReviewStartMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ preprint: id }),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(requestReviewStart)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getReviewRequest: (orcid, preprint) => withEnv(Keyv.getReviewRequest, env)([orcid, preprint]),
          saveReviewRequest: (orcid, preprint, request) =>
            withEnv(Keyv.saveReviewRequest, env)([orcid, preprint], request),
        })),
      ),
    ),
    pipe(
      requestReviewCheckMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ preprint: id }),
          RM.apS('user', maybeGetUser),
          RM.apS('method', RM.fromMiddleware(getMethod)),
          RM.bindW('response', RM.fromReaderTaskK(requestReviewCheck)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getReviewRequest: (orcid, preprint) => withEnv(Keyv.getReviewRequest, env)([orcid, preprint]),
          publishRequest: withEnv(publishToPrereviewCoarNotifyInbox, env),
          saveReviewRequest: (orcid, preprint, request) =>
            withEnv(Keyv.saveReviewRequest, env)([orcid, preprint], request),
        })),
      ),
    ),
    pipe(
      requestReviewPublishedMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ preprint: id }),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(requestReviewPublished)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getReviewRequest: (orcid, preprint) => withEnv(Keyv.getReviewRequest, env)([orcid, preprint]),
        })),
      ),
    ),
    pipe(
      authorInviteMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(authorInvite)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
        })),
      ),
    ),
    pipe(
      authorInviteDeclineMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.apS('method', RM.fromMiddleware(getMethod)),
          RM.bindW('response', RM.fromReaderTaskK(authorInviteDecline)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
          saveAuthorInvite: withEnv(Keyv.saveAuthorInvite, env),
        })),
      ),
    ),
    pipe(
      authorInviteStartMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(authorInviteStart)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
          saveAuthorInvite: withEnv(Keyv.saveAuthorInvite, env),
        })),
      ),
    ),
    pipe(
      authorInviteEnterEmailAddressMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS('method', RM.fromMiddleware(getMethod)),
          RM.bindW('response', RM.fromReaderTaskK(authorInviteEnterEmailAddress)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
          saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, env),
          verifyContactEmailAddressForInvitedAuthor: withEnv(
            flow(RTE.fromReaderK(createContactEmailAddressVerificationEmailForInvitedAuthor), RTE.chainW(sendEmail)),
            env,
          ),
        })),
      ),
    ),
    pipe(
      authorInviteNeedToVerifyEmailAddressMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(authorInviteNeedToVerifyEmailAddress)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
        })),
      ),
    ),
    pipe(
      authorInviteVerifyEmailAddressMatch.parser,
      P.map(({ id, verify }) =>
        pipe(
          RM.of({ id, verify }),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(authorInviteVerifyEmailAddress)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
          saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, env),
        })),
      ),
    ),
    pipe(
      authorInvitePersonaMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS('method', RM.fromMiddleware(getMethod)),
          RM.bindW('response', RM.fromReaderTaskK(authorInvitePersona)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
          saveAuthorInvite: withEnv(Keyv.saveAuthorInvite, env),
        })),
      ),
    ),
    pipe(
      authorInviteCheckMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.apS('method', RM.fromMiddleware(getMethod)),
          RM.bindW('response', RM.fromReaderTaskK(authorInviteCheck)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          addAuthorToPrereview: withEnv(addAuthorToPrereview, env),
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
          saveAuthorInvite: withEnv(Keyv.saveAuthorInvite, env),
        })),
      ),
    ),
    pipe(
      authorInvitePublishedMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.apS('method', RM.fromMiddleware(getMethod)),
          RM.bindW('response', RM.fromReaderTaskK(authorInvitePublished)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getAuthorInvite: withEnv(Keyv.getAuthorInvite, env),
          getPrereview: withEnv(
            flow(
              getPrereviewFromZenodo,
              RTE.mapLeft(() => 'unavailable' as const),
            ),
            env,
          ),
        })),
      ),
    ),
    pipe(
      scietyListMatch.parser,
      P.map(() => scietyList),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereviews: withEnv(() => getPrereviewsForSciety, env),
        })),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const routes = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)
