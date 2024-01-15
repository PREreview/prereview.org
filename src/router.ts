import cookieSignature from 'cookie-signature'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { constant, flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { NotFound } from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { aboutUs } from './about-us'
import type { ConfigEnv } from './app'
import { authorInvite, authorInviteCheck, authorInviteStart } from './author-invite-flow'
import { getAvatarFromCloudinary } from './cloudinary'
import { clubProfile } from './club-profile'
import { clubs } from './clubs'
import { codeOfConduct } from './code-of-conduct'
import { connectSlack, connectSlackCode, connectSlackError, connectSlackStart } from './connect-slack'
import { disconnectSlack } from './disconnect-slack'
import { ediaStatement } from './edia-statement'
import {
  type SendEmailEnv,
  sendContactEmailAddressVerificationEmail,
  sendContactEmailAddressVerificationEmailForReview,
} from './email'
import { getFlashMessage } from './flash-message'
import { funding } from './funding'
import { home } from './home'
import { howToUse } from './how-to-use'
import {
  deleteCareerStage,
  deleteContactEmailAddress,
  deleteLanguages,
  deleteLocation,
  deleteResearchInterests,
  deleteSlackUserId,
  getAuthorInvite,
  getCareerStage,
  getContactEmailAddress,
  getLanguages,
  getLocation,
  getResearchInterests,
  getSlackUserId,
  isOpenForRequests,
  saveCareerStage,
  saveContactEmailAddress,
  saveLanguages,
  saveLocation,
  saveOpenForRequests,
  saveResearchInterests,
  saveSlackUserId,
  saveUserOnboarding,
} from './keyv'
import {
  createPrereviewOnLegacyPrereview,
  getPseudonymFromLegacyPrereview,
  getRapidPreviewsFromLegacyPrereview,
  isLegacyCompatiblePreprint,
  isLegacyCompatiblePrereview,
} from './legacy-prereview'
import { liveReviews } from './live-reviews'
import { authenticate, authenticateError, logIn, logOut } from './log-in'
import { getMethod } from './middleware'
import {
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
  verifyContactEmailAddress,
} from './my-details-page'
import { getNameFromOrcid } from './orcid'
import type { TemplatePageEnv } from './page'
import { partners } from './partners'
import { people } from './people'
import type { DoesPreprintExistEnv, GetPreprintEnv, GetPreprintTitleEnv } from './preprint'
import { preprintReviews } from './preprint-reviews'
import { privacyPolicy } from './privacy-policy'
import { profile } from './profile-page'
import { resources } from './resources'
import { handleResponse } from './response'
import { review } from './review'
import { reviewAPreprint } from './review-a-preprint'
import { reviews } from './reviews'
import {
  aboutUsMatch,
  authorInviteCheckMatch,
  authorInviteMatch,
  authorInviteStartMatch,
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
  connectSlackCodeMatch,
  connectSlackErrorMatch,
  connectSlackMatch,
  connectSlackStartMatch,
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
  resourcesMatch,
  reviewAPreprintMatch,
  reviewMatch,
  reviewsMatch,
  scietyListMatch,
  trainingsMatch,
  verifyContactEmailAddressMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
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
  writeReviewResultsSupportedMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
  writeReviewStartMatch,
  writeReviewVerifyEmailAddressMatch,
} from './routes'
import { scietyList } from './sciety-list'
import { addOrcidToSlackProfile, getUserFromSlack, removeOrcidFromSlackProfile } from './slack'
import type { SlackUserId } from './slack-user-id'
import { trainings } from './trainings'
import type { PreprintId } from './types/preprint-id'
import type { GenerateUuidEnv } from './types/uuid'
import { type GetUserEnv, maybeGetUser } from './user'
import type { GetUserOnboardingEnv } from './user-onboarding'
import {
  type NewPrereview,
  writeReview,
  writeReviewAddAuthors,
  writeReviewAuthors,
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
  writeReviewResultsSupported,
  writeReviewReview,
  writeReviewReviewType,
  writeReviewShouldRead,
  writeReviewStart,
  writeReviewVerifyEmailAddress,
} from './write-review'
import {
  createRecordOnZenodo,
  getPrereviewFromZenodo,
  getPrereviewsForClubFromZenodo,
  getPrereviewsForPreprintFromZenodo,
  getPrereviewsForProfileFromZenodo,
  getRecentPrereviewsFromZenodo,
} from './zenodo'

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

const getSlackUser = flow(
  getSlackUserId,
  RTE.chainW(({ userId }) => getUserFromSlack(userId)),
)

const withEnv =
  <R, A extends ReadonlyArray<unknown>, B>(f: (...a: A) => R.Reader<R, B>, env: R) =>
  (...a: A) =>
    f(...a)(env)

export type RouterEnv = ConfigEnv &
  DoesPreprintExistEnv &
  GenerateUuidEnv &
  GetPreprintEnv &
  GetPreprintTitleEnv &
  GetUserEnv &
  GetUserOnboardingEnv &
  SendEmailEnv &
  TemplatePageEnv

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
          RM.apSW('response', RM.fromReaderTask(reviews(page))),
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
                saveSlackUserId(orcid, slackUser),
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
                    getSlackUserId,
                    RTE.chainW(removeOrcidFromSlackProfile),
                    RTE.orElseW(() => RTE.right(undefined)),
                  ),
                ),
                RTE.chainW(deleteSlackUserId),
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
          RM.apSW('response', RM.fromReaderTask(preprintReviews(id))),
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
          RM.apSW('response', RM.fromReaderTask(review(id))),
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
          RM.apS('message', RM.fromMiddleware(getFlashMessage(D.string))),
          RM.apS('user', maybeGetUser),
          RM.bindW('response', RM.fromReaderTaskK(myDetails)),
          RM.ichainW(handleResponse),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          canConnectSlack: () => true,
          getCareerStage: withEnv(getCareerStage, env),
          getContactEmailAddress: withEnv(getContactEmailAddress, env),
          getLanguages: withEnv(getLanguages, env),
          getLocation: withEnv(getLocation, env),
          getResearchInterests: withEnv(getResearchInterests, env),
          getSlackUser: withEnv(getSlackUser, env),
          isOpenForRequests: withEnv(isOpenForRequests, env),
          saveUserOnboarding: withEnv(saveUserOnboarding, env),
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
          deleteCareerStage: withEnv(deleteCareerStage, env),
          getCareerStage: withEnv(getCareerStage, env),
          saveCareerStage: withEnv(saveCareerStage, env),
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
          deleteCareerStage: withEnv(deleteCareerStage, env),
          getCareerStage: withEnv(getCareerStage, env),
          saveCareerStage: withEnv(saveCareerStage, env),
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
          isOpenForRequests: withEnv(isOpenForRequests, env),
          saveOpenForRequests: withEnv(saveOpenForRequests, env),
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
          isOpenForRequests: withEnv(isOpenForRequests, env),
          saveOpenForRequests: withEnv(saveOpenForRequests, env),
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
          deleteResearchInterests: withEnv(deleteResearchInterests, env),
          getResearchInterests: withEnv(getResearchInterests, env),
          saveResearchInterests: withEnv(saveResearchInterests, env),
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
          deleteResearchInterests: withEnv(deleteResearchInterests, env),
          getResearchInterests: withEnv(getResearchInterests, env),
          saveResearchInterests: withEnv(saveResearchInterests, env),
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
          deleteLocation: withEnv(deleteLocation, env),
          getLocation: withEnv(getLocation, env),
          saveLocation: withEnv(saveLocation, env),
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
          deleteLanguages: withEnv(deleteLanguages, env),
          getLanguages: withEnv(getLanguages, env),
          saveLanguages: withEnv(saveLanguages, env),
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
          deleteLocation: withEnv(deleteLocation, env),
          getLocation: withEnv(getLocation, env),
          saveLocation: withEnv(saveLocation, env),
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
          deleteLanguages: withEnv(deleteLanguages, env),
          getLanguages: withEnv(getLanguages, env),
          saveLanguages: withEnv(saveLanguages, env),
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
          deleteContactEmailAddress: withEnv(deleteContactEmailAddress, env),
          getContactEmailAddress: withEnv(getContactEmailAddress, env),
          saveContactEmailAddress: withEnv(saveContactEmailAddress, env),
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
          deleteContactEmailAddress: withEnv(deleteContactEmailAddress, env),
          getContactEmailAddress: withEnv(getContactEmailAddress, env),
          saveContactEmailAddress: withEnv(saveContactEmailAddress, env),
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
          getAvatar: withEnv(getAvatarFromCloudinary, env),
          getCareerStage: withEnv(getCareerStage, env),
          getLanguages: withEnv(getLanguages, env),
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
      writeReviewEnterEmailAddressMatch.parser,
      P.map(({ id }) => writeReviewEnterEmailAddress(id)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          deleteContactEmailAddress: withEnv(deleteContactEmailAddress, env),
          getContactEmailAddress: withEnv(getContactEmailAddress, env),
          saveContactEmailAddress: withEnv(saveContactEmailAddress, env),
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
          getContactEmailAddress: withEnv(getContactEmailAddress, env),
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
          deleteContactEmailAddress: withEnv(deleteContactEmailAddress, env),
          getContactEmailAddress: withEnv(getContactEmailAddress, env),
          saveContactEmailAddress: withEnv(saveContactEmailAddress, env),
        })),
      ),
    ),
    pipe(
      writeReviewPublishMatch.parser,
      P.map(({ id }) => writeReviewPublish(id)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getContactEmailAddress: withEnv(getContactEmailAddress, env),
          publishPrereview: withEnv(publishPrereview, env),
        })),
      ),
    ),
    pipe(
      writeReviewPublishedMatch.parser,
      P.map(({ id }) => writeReviewPublished(id)),
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
          getAuthorInvite: withEnv(getAuthorInvite, env),
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
          getAuthorInvite: withEnv(getAuthorInvite, env),
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
          getAuthorInvite: withEnv(getAuthorInvite, env),
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
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const routes = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)
