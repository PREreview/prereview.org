import type { Effect } from 'effect'
import type { Locale } from '../../Context.ts'
import type { Uuid } from '../../types/Uuid.ts'
import type { LoggedInUser } from '../../user.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import type * as Response from '../Response/index.ts'

export const VerifyEmailAddress: (args: {
  readonly verificationToken: Uuid
  readonly redirectTo?: `/${string}` | undefined
}) => Effect.Effect<Response.Response, never, Locale | LoggedInUser> = () => HavingProblemsPage
