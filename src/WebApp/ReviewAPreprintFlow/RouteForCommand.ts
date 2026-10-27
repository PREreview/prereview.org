import { format, type Match } from 'fp-ts-routing'
import type * as PreprintReviews from '../../PreprintReviews/index.ts'
import type { IndeterminatePreprintId, PreprintId } from '../../Preprints/index.ts'
import * as Routes from '../../routes.ts'

interface RouteToPreprintReview {
  href: (params: { preprintId: PreprintId }) => string
}

export const RouteForCommand = (command: PreprintReviews.NextExpectedCommand): RouteToPreprintReview =>
  commandRoutes[command]

const legacyRoute = (match: Match<{ id: IndeterminatePreprintId }>): RouteToPreprintReview => ({
  href: ({ preprintId }) => format(match.formatter, { id: preprintId }),
})

const commandRoutes = {
  ChooseReviewType: legacyRoute(Routes.writeReviewReviewTypeMatch),
  DeclareUseOfAi: Routes.ReviewAPreprintUseOfAi,
  AnswerIfTheIntroductionMatches: legacyRoute(Routes.writeReviewIntroductionMatchesMatch),
  AnswerIfTheMethodsAreAppropriate: legacyRoute(Routes.writeReviewMethodsAppropriateMatch),
  AnswerIfTheResultsAreSupported: legacyRoute(Routes.writeReviewResultsSupportedMatch),
  AnswerIfTheDataPresentationIsWellSuited: legacyRoute(Routes.writeReviewDataPresentationMatch),
  AnswerIfTheFindingsAndNextStepsAreClear: legacyRoute(Routes.writeReviewFindingsNextStepsMatch),
  AnswerIfThePreprintIsNovel: legacyRoute(Routes.writeReviewNovelMatch),
  AnswerIfTheLanguageNeedsEditing: legacyRoute(Routes.writeReviewLanguageEditingMatch),
  AnswerIfThePreprintShouldBeRead: legacyRoute(Routes.writeReviewShouldReadMatch),
  AnswerIfThePreprintIsReadyForAFullReview: legacyRoute(Routes.writeReviewReadyFullReviewMatch),
  WriteReview: legacyRoute(Routes.writeReviewReviewMatch),
  ChoosePersona: legacyRoute(Routes.writeReviewPersonaMatch),
  AnswerIfOthersNeedToBeListed: legacyRoute(Routes.writeReviewAuthorsMatch),
  AddOtherAuthors: legacyRoute(Routes.writeReviewAuthorsMatch),
  DeclareCompetingInterests: legacyRoute(Routes.writeReviewCompetingInterestsMatch),
  DeclareFollowingCodeOfConduct: legacyRoute(Routes.writeReviewConductMatch),
  PublishPreprintReview: legacyRoute(Routes.writeReviewPublishMatch),
} satisfies Record<PreprintReviews.NextExpectedCommand, RouteToPreprintReview>
