import type * as Preprints from '../../Preprints/index.ts'
import type * as ReviewRequests from '../../ReviewRequests/index.ts'
import * as Routes from '../../routes.ts'

export const RouteForCommand = (
  command: ReviewRequests.NextExpectedCommand,
): Routes.Route<{ preprintId: Preprints.IndeterminatePreprintId }> => commandRoutes[command]

const commandRoutes = {
  ChoosePersona: Routes.RequestAReviewChooseYourPersona,
  PublishReviewRequest: Routes.RequestAReviewCheckYourRequest,
} satisfies Record<ReviewRequests.NextExpectedCommand, Routes.Route<{ preprintId: Preprints.IndeterminatePreprintId }>>
