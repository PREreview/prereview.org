import type * as AuthorInvites from '../../AuthorInvites/index.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/Uuid.ts'

export const RouteForCommand = (command: AuthorInvites.NextExpectedCommand): Routes.Route<{ invitationId: Uuid }> =>
  commandRoutes[command]

const commandRoutes = {
  ChoosePersona: Routes.AuthorInviteChooseYourPersona,
} satisfies Record<AuthorInvites.NextExpectedCommand, Routes.Route<{ invitationId: Uuid }>>
