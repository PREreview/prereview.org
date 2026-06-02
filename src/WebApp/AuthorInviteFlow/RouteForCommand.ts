import type * as AuthorInvites from '../../AuthorInvites/index.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/Uuid.ts'

export const RouteForCommand = (command: AuthorInvites.NextExpectedCommand): Routes.Route<{ reviewId: Uuid }> =>
  commandRoutes[command]

const commandRoutes = {
  ChoosePersona: Routes.AuthorInviteChooseYourPersona,
  ConfirmAuthorChoices: Routes.AuthorInviteConfirmAuthorChoices,
} satisfies Record<AuthorInvites.NextExpectedCommand, Routes.Route<{ reviewId: Uuid }>>
