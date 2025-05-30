import type { HttpClient } from '@effect/platform'
import { Array, Effect, Function, flow, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import httpErrors from 'http-errors'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import type { SessionEnv } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { fromRequestHandler } from 'hyper-ts/lib/express.js'
import type * as L from 'logger-fp-ts'
import multer, { MulterError } from 'multer'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import type { ZenodoAuthenticatedEnv } from 'zenodo-ts'
import type * as CachingHttpClient from './CachingHttpClient/index.js'
import type { Locale } from './Context.js'
import type { EffectEnv } from './EffectToFpts.js'
import * as EffectToFpts from './EffectToFpts.js'
import * as FeatureFlags from './FeatureFlags.js'
import { withEnv } from './Fpts.js'
import * as OpenAlex from './OpenAlex/index.js'
import * as Zenodo from './Zenodo/index.js'
import {
  authorInviteCheck,
  authorInviteDecline,
  authorInviteEnterEmailAddress,
  authorInviteNeedToVerifyEmailAddress,
  authorInvitePersona,
  authorInvitePublished,
  authorInviteStart,
  authorInviteVerifyEmailAddress,
} from './author-invite-flow/index.js'
import { type OpenAuthorInvite, createAuthorInvite } from './author-invite.js'
import {
  type CloudinaryApiEnv,
  getAvatarFromCloudinary,
  removeAvatarFromCloudinary,
  saveAvatarOnCloudinary,
} from './cloudinary.js'
import { clubProfile } from './club-profile-page/index.js'
import { clubsData } from './clubs-data/index.js'
import {
  type OrcidOAuthEnv as ConnectOrcidOAuthEnv,
  connectOrcid,
  connectOrcidCode,
  connectOrcidError,
  connectOrcidStart,
  disconnectOrcid,
} from './connect-orcid/index.js'
import {
  type SlackOAuthEnv,
  connectSlack,
  connectSlackCode,
  connectSlackError,
  connectSlackStart,
} from './connect-slack-page/index.js'
import { disconnectSlack } from './disconnect-slack-page/index.js'
import {
  type SendEmailEnv,
  createAuthorInviteEmail,
  createContactEmailAddressVerificationEmailForInvitedAuthor,
  sendContactEmailAddressVerificationEmail,
  sendContactEmailAddressVerificationEmailForReview,
  sendEmail,
} from './email.js'
import * as Keyv from './keyv.js'
import {
  type LegacyPrereviewApiEnv,
  createPrereviewOnLegacyPrereview,
  createUserOnLegacyPrereview,
  getPseudonymFromLegacyPrereview,
  getUsersFromLegacyPrereview,
  isLegacyCompatiblePrereview,
} from './legacy-prereview.js'
import type { SupportedLocale } from './locales/index.js'
import {
  type IsUserBlockedEnv,
  type OrcidOAuthEnv,
  authenticate,
  authenticateError,
  logIn,
  logOut,
} from './log-in/index.js'
import {
  changeAvatar,
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
  removeAvatar,
  verifyContactEmailAddress,
} from './my-details-page/index.js'
import { type OrcidApiEnv, getNameFromOrcid } from './orcid.js'
import type { TemplatePageEnv } from './page.js'
import type { GetPreprintEnv, GetPreprintIdEnv, GetPreprintTitleEnv, ResolvePreprintIdEnv } from './preprint.js'
import * as PrereviewCoarNotify from './prereview-coar-notify/index.js'
import {
  type PrereviewCoarNotifyEnv,
  getReviewRequestsFromPrereviewCoarNotify,
  isReviewRequested,
  sendPrereviewToPrereviewCoarNotifyInbox,
} from './prereview-coar-notify/index.js'
import { profile } from './profile-page/index.js'
import type { PublicUrlEnv } from './public-url.js'
import {
  requestReviewCheck,
  requestReviewPersona,
  requestReviewPublished,
  requestReviewStart,
} from './request-review-flow/index.js'
import { handleResponse } from './response.js'
import type { ReviewRequestPreprintId } from './review-request.js'
import { reviewRequests } from './review-requests-page/index.js'
import { reviewsData } from './reviews-data/index.js'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteEnterEmailAddressMatch,
  authorInviteNeedToVerifyEmailAddressMatch,
  authorInvitePersonaMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
  authorInviteVerifyEmailAddressMatch,
  changeAvatarMatch,
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
  clubsDataMatch,
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
  logInMatch,
  logOutMatch,
  orcidCodeMatch,
  orcidErrorMatch,
  profileMatch,
  removeAvatarMatch,
  requestReviewCheckMatch,
  requestReviewPersonaMatch,
  requestReviewPublishedMatch,
  requestReviewStartMatch,
  reviewRequestsMatch,
  reviewsDataMatch,
  scietyListMatch,
  usersDataMatch,
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
  writeReviewUseOfAiMatch,
  writeReviewVerifyEmailAddressMatch,
} from './routes.js'
import { type ScietyListEnv, scietyList } from './sciety-list/index.js'
import type { AddToSessionEnv, PopFromSessionEnv } from './session.js'
import type { SlackUserId } from './slack-user-id.js'
import {
  type SlackApiEnv,
  type SlackApiUpdateEnv,
  addOrcidToSlackProfile,
  getUserFromSlack,
  removeOrcidFromSlackProfile,
} from './slack.js'
import type { PreprintId } from './types/preprint-id.js'
import { type GenerateUuid, type GenerateUuidEnv, generateUuid } from './types/uuid.js'
import type { GetUserOnboardingEnv } from './user-onboarding.js'
import type { User } from './user.js'
import { usersData } from './users-data/index.js'
import {
  type FormStoreEnv,
  type NewPrereview,
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
  writeReviewUseOfAi,
  writeReviewUseOfAiSubmission,
  writeReviewVerifyEmailAddress,
} from './write-review/index.js'
import {
  type WasPrereviewRemovedEnv,
  addAuthorToRecordOnZenodo,
  createRecordOnZenodo,
  getPrereviewFromZenodo,
  getPrereviewsForClubFromZenodo,
  getPrereviewsForProfileFromZenodo,
  getPrereviewsForSciety,
} from './zenodo.js'

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

export const getSlackUser = flow(
  Keyv.getSlackUserId,
  RTE.chainW(({ userId }) => getUserFromSlack(userId)),
)

export type RouterEnv = Keyv.AvatarStoreEnv &
  EffectEnv<
    | CachingHttpClient.HttpCache
    | FeatureFlags.FeatureFlags
    | Locale
    | OpenAlex.GetCategories
    | GenerateUuid
    | HttpClient.HttpClient
    | PrereviewCoarNotify.PrereviewCoarNotifyConfig
    | Zenodo.ZenodoOrigin
  > &
  ResolvePreprintIdEnv &
  GetPreprintIdEnv &
  GenerateUuidEnv &
  GetPreprintEnv &
  GetPreprintTitleEnv &
  GetUserOnboardingEnv &
  Keyv.AuthorInviteStoreEnv &
  Keyv.CareerStageStoreEnv &
  CloudinaryApiEnv &
  ConnectOrcidOAuthEnv &
  Keyv.ContactEmailAddressStoreEnv &
  FormStoreEnv &
  Keyv.IsOpenForRequestsStoreEnv &
  IsUserBlockedEnv &
  Keyv.LanguagesStoreEnv &
  LegacyPrereviewApiEnv &
  Keyv.LocationStoreEnv & { locale: SupportedLocale; user?: User } & L.LoggerEnv &
  OrcidApiEnv &
  Keyv.OrcidTokenStoreEnv &
  OrcidOAuthEnv &
  PrereviewCoarNotifyEnv &
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
  AddToSessionEnv &
  PopFromSessionEnv &
  WasPrereviewRemovedEnv &
  ZenodoAuthenticatedEnv

const maybeGetUser = RM.asks((env: RouterEnv) => env.user)

const triggerRefreshOfPrereview = (prereviewId: number, preprintId: PreprintId | undefined, user: User) =>
  EffectToFpts.toReaderTaskEither(Zenodo.invalidatePrereviewInCache({ prereviewId, preprintId, user }))

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5_242_880 } })

const publishPrereview = (newPrereview: NewPrereview) =>
  pipe(
    createRecordOnZenodo(newPrereview),
    RTE.chainFirstW(
      isLegacyCompatiblePrereview(newPrereview)
        ? flow(
            ([doi]) => doi,
            createPrereviewOnLegacyPrereview(newPrereview),
            RTE.altW(() => RTE.right(undefined)),
          )
        : () => RTE.right(undefined),
    ),
    RTE.chainFirstW(([, review]) =>
      pipe(
        newPrereview.otherAuthors,
        RTE.traverseSeqArray(otherAuthor =>
          pipe(
            createAuthorInvite({ status: 'open', emailAddress: otherAuthor.emailAddress, review }),
            RTE.chainReaderKW(authorInvite =>
              createAuthorInviteEmail(
                otherAuthor,
                authorInvite,
                {
                  ...newPrereview,
                  author: match(newPrereview.persona)
                    .with('public', () => newPrereview.user.name)
                    .with('pseudonym', () => newPrereview.user.pseudonym)
                    .exhaustive(),
                },
                newPrereview.locale,
              ),
            ),
            RTE.chainW(sendEmail),
          ),
        ),
      ),
    ),
    RTE.chainFirstReaderIOKW(([doi, review]) => sendPrereviewToPrereviewCoarNotifyInbox(newPrereview, doi, review)),
    RTE.chainFirstW(([, review]) => triggerRefreshOfPrereview(review, newPrereview.preprint.id, newPrereview.user)),
  )

const addAuthorToPrereview = (id: number, user: User, persona: 'public' | 'pseudonym') =>
  pipe(
    addAuthorToRecordOnZenodo(id, user, persona),
    RTE.chainFirstW(() => triggerRefreshOfPrereview(id, undefined, user)),
  )

const router: P.Parser<RM.ReaderMiddleware<RouterEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
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
          getPseudonym: withEnv(
            (user: { orcid: Orcid; name: string }) =>
              pipe(
                getPseudonymFromLegacyPrereview(user.orcid),
                RTE.orElse(error =>
                  match(error)
                    .with('not-found', () => createUserOnLegacyPrereview(user))
                    .with('unavailable', RTE.left)
                    .exhaustive(),
                ),
              ),
            env,
          ),
        })),
      ),
    ),
    pipe(
      orcidErrorMatch.parser,
      P.map(({ error }) =>
        pipe(
          RM.of({}),
          RM.apS('error', RM.of(error)),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.ichainW(authenticateError),
        ),
      ),
    ),
    pipe(
      connectOrcidMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bind('response', ({ locale }) => RM.of(connectOrcidError({ error, locale }))),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
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
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(connectSlack)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          isSlackUser: withEnv(isSlackUser, env),
        })),
      ),
    ),
    pipe(
      connectSlackStartMatch.parser,
      P.map(() =>
        pipe(
          RM.of({}),
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(connectSlackStart)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      connectSlackCodeMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(connectSlackCode)),
          RM.ichainW(handleResponse),
        ),
      ),
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
        })),
      ),
    ),
    pipe(
      connectSlackErrorMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bind('response', args => RM.of(connectSlackError(args))),
          RM.ichainW(handleResponse),
        ),
      ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(disconnectSlack)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
      P.map(
        flow(
          RM.of,
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(profile)),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', ({ locale }) => RM.fromReaderTask(clubProfile(id, locale))),
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
      writeReviewStartMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewReview)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewIntroductionMatchesMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewIntroductionMatches)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewMethodsAppropriateMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewMethodsAppropriate)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewResultsSupportedMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewResultsSupported)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewDataPresentationMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewDataPresentation)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewFindingsNextStepsMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewFindingsNextSteps)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewNovelMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewNovel)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewLanguageEditingMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewLanguageEditing)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewShouldReadMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewShouldRead)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewReadyFullReviewMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewReadyFullReview)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewPersonaMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewPersona)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewAuthorsMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewAuthors)),
          RM.ichainW(handleResponse),
        ),
      ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW(
            'canAddMultipleAuthors',
            EffectToFpts.toReaderMiddlewareK(({ user }) => FeatureFlags.canAddMultipleAuthors(user)),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewAddAuthors)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewUseOfAiMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', state =>
            RM.fromReaderTask((state.method === 'POST' ? writeReviewUseOfAiSubmission : writeReviewUseOfAi)(state)),
          ),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewCompetingInterestsMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewCompetingInterests)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewConductMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewConduct)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      writeReviewEnterEmailAddressMatch.parser,
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewEnterEmailAddress)),
          RM.ichainW(handleResponse),
        ),
      ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewNeedToVerifyEmailAddress)),
          RM.ichainW(handleResponse),
        ),
      ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewVerifyEmailAddress)),
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
      writeReviewPublishMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewPublish)),
          RM.ichainW(handleResponse),
        ),
      ),
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
            getPreprintSubjects: withEnv(
              (id: PreprintId) =>
                pipe(
                  match(id)
                    .with({ _tag: 'philsci' }, () => RTE.of([]))
                    .otherwise(
                      EffectToFpts.toReaderTaskEitherK(id =>
                        pipe(OpenAlex.GetCategories, Effect.andThen(Function.apply(id.value))),
                      ),
                    ),
                  RTE.match(
                    () => [],
                    Array.map(category => ({ id: category.id, name: category.display_name })),
                  ),
                ),
              env,
            ),
            isReviewRequested: withEnv(
              flow(
                isReviewRequested,
                RTE.getOrElse(() => RT.of(false)),
              ),
              env,
            ),
          }),
        })),
      ),
    ),
    pipe(
      writeReviewPublishedMatch.parser,
      P.map(
        flow(
          RM.of,
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(writeReviewPublished)),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      reviewRequestsMatch.parser,
      P.map(({ field, language, page }) =>
        pipe(
          RM.of({ field, language, page: page ?? 1 }),
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bindW('response', RM.fromReaderTaskK(reviewRequests)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getReviewRequests: withEnv(getReviewRequestsFromPrereviewCoarNotify, env),
        })),
      ),
    ),
    pipe(
      requestReviewStartMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ preprint: id }),
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
      requestReviewPersonaMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ preprint: id }),
          RM.apS('user', maybeGetUser),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.apS(
            'body',
            RM.gets(c => c.getBody()),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.bindW('response', RM.fromReaderTaskK(requestReviewPersona)),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.bindW('response', RM.fromReaderTaskK(requestReviewCheck)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getReviewRequest: (orcid, preprint) => withEnv(Keyv.getReviewRequest, env)([orcid, preprint]),
          publishRequest: withEnv(
            EffectToFpts.toReaderTaskEitherK(
              (preprint: ReviewRequestPreprintId, user: User, persona: 'public' | 'pseudonym') =>
                pipe(
                  PrereviewCoarNotify.publishReviewRequest,
                  Function.apply(preprint, user, persona),
                  Effect.tapError(error =>
                    Effect.logError('Failed to publishRequest (COAR)').pipe(Effect.annotateLogs({ error })),
                  ),
                  Effect.mapError(() => 'unavailable' as const),
                ),
            ),
            env,
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
      authorInviteDeclineMatch.parser,
      P.map(({ id }) =>
        pipe(
          RM.of({ id }),
          RM.apS('user', maybeGetUser),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
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
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.apS(
            'method',
            RM.gets(c => c.getMethod()),
          ),
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
      usersDataMatch.parser,
      P.map(() =>
        pipe(
          RM.decodeHeader('Authorization', input => (typeof input === 'string' ? E.right(input) : E.right(''))),
          RM.chainReaderTaskEitherK(usersData),
          RM.ichainFirst(() => RM.status(Status.OK)),
          RM.ichainFirst(() => RM.contentType('application/json')),
          RM.ichainFirst(() => RM.closeHeaders()),
          RM.ichainW(RM.send),
          RM.orElseW(error =>
            match(error)
              .with('unavailable', () =>
                pipe(RM.status(Status.ServiceUnavailable), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
              .exhaustive(),
          ),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getUsers: withEnv(
            () =>
              pipe(
                RTE.Do,
                RTE.apS('users', getUsersFromLegacyPrereview()),
                RTE.apSW('careerStages', Keyv.getAllCareerStages),
                RTE.apSW('locations', Keyv.getAllLocations),
                RTE.map(({ users, careerStages, locations }) =>
                  pipe(
                    users,
                    Array.map(user => ({
                      ...user,
                      careerStage: careerStages[user.orcid]?.value,
                      location: locations[user.orcid]?.value,
                    })),
                  ),
                ),
              ),
            env,
          ),
        })),
      ),
    ),
    pipe(
      clubsDataMatch.parser,
      P.map(() =>
        pipe(
          RM.decodeHeader('Authorization', input => (typeof input === 'string' ? E.right(input) : E.right(''))),
          RM.chainReaderTaskEitherK(clubsData),
          RM.ichainFirst(() => RM.status(Status.OK)),
          RM.ichainFirst(() => RM.contentType('application/json')),
          RM.ichainFirst(() => RM.closeHeaders()),
          RM.ichainW(RM.send),
          RM.orElseW(error =>
            match(error)
              .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
              .exhaustive(),
          ),
        ),
      ),
    ),
    pipe(
      reviewsDataMatch.parser,
      P.map(() =>
        pipe(
          RM.decodeHeader('Authorization', input => (typeof input === 'string' ? E.right(input) : E.right(''))),
          RM.chainReaderTaskEitherK(reviewsData),
          RM.ichainFirst(() => RM.status(Status.OK)),
          RM.ichainFirst(() => RM.contentType('application/json')),
          RM.ichainFirst(() => RM.closeHeaders()),
          RM.ichainW(RM.send),
          RM.orElseW(error =>
            match(error)
              .with('unavailable', () =>
                pipe(RM.status(Status.ServiceUnavailable), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
              .exhaustive(),
          ),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereviews: withEnv(() => getPrereviewsForSciety, env),
        })),
      ),
    ),
    pipe(
      scietyListMatch.parser,
      P.map(() =>
        pipe(
          RM.decodeHeader('Authorization', input => (typeof input === 'string' ? E.right(input) : E.right(''))),
          RM.chainReaderTaskEitherK(scietyList),
          RM.ichainFirst(() => RM.status(Status.OK)),
          RM.ichainFirst(() => RM.contentType('application/json')),
          RM.ichainFirst(() => RM.closeHeaders()),
          RM.ichainW(RM.send),
          RM.orElseW(error =>
            match(error)
              .with('unavailable', () =>
                pipe(RM.status(Status.ServiceUnavailable), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
              .exhaustive(),
          ),
        ),
      ),
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

export const routes = pipe(route(router, Function.constant(new httpErrors.NotFound())), RM.fromMiddleware, RM.iflatten)
