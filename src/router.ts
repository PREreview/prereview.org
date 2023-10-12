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
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import * as uuid from 'uuid-ts'
import { aboutUs } from './about-us'
import type { ConfigEnv } from './app'
import { getAvatarFromCloudinary } from './cloudinary'
import { clubProfile } from './club-profile'
import { clubs } from './clubs'
import { codeOfConduct } from './code-of-conduct'
import { connectSlack, connectSlackCode, connectSlackError, connectSlackStart } from './connect-slack'
import { disconnectSlack } from './disconnect-slack'
import { ediStatement } from './edi-statement'
import { findAPreprint } from './find-a-preprint'
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
} from './my-details-page'
import { getNameFromOrcid } from './orcid'
import type { TemplatePageEnv } from './page'
import { partners } from './partners'
import { people } from './people'
import type { DoesPreprintExistEnv, GetPreprintEnv, GetPreprintTitleEnv } from './preprint'
import { preprintReviews } from './preprint-reviews'
import { privacyPolicy } from './privacy-policy'
import { profile } from './profile-page'
import { review } from './review'
import { reviewAPreprint } from './review-a-preprint'
import { reviews } from './reviews'
import {
  aboutUsMatch,
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
  ediStatementMatch,
  findAPreprintMatch,
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
  reviewAPreprintMatch,
  reviewMatch,
  reviewsMatch,
  scietyListMatch,
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
import { scietyList } from './sciety-list'
import { addOrcidToSlackProfile, getUserFromSlack, removeOrcidFromSlackProfile } from './slack'
import type { SlackUserId } from './slack-user-id'
import { trainings } from './trainings'
import type { PreprintId } from './types/preprint-id'
import type { GetUserEnv } from './user'
import {
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
  GetPreprintEnv &
  GetPreprintTitleEnv &
  GetUserEnv &
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
      howToUseMatch.parser,
      P.map(() => howToUse),
    ),
    pipe(
      peopleMatch.parser,
      P.map(() => people),
    ),
    pipe(
      codeOfConductMatch.parser,
      P.map(() => codeOfConduct),
    ),
    pipe(
      ediStatementMatch.parser,
      P.map(() => ediStatement),
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
        R.local((env: ConfigEnv) => ({
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
      P.map(() => disconnectSlack),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
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
          getLanguages: withEnv(getLanguages, env),
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
      changeLanguagesVisibilityMatch.parser,
      P.map(() => changeLanguagesVisibility),
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
      P.map(() => changeContactEmailAddress),
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
      P.map(({ profile: profileId }) => profile(profileId)),
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
    pipe(
      scietyListMatch.parser,
      P.map(() => scietyList),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const routes = pipe(route(router, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)
