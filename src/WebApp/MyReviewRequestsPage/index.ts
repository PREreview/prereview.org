import type { Effect } from 'effect'
import type { Locale } from '../../Context.ts'
import type { LoggedInUser } from '../../user.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import type { PageResponse } from '../Response/index.ts'

export const MyReviewRequestsPage: Effect.Effect<PageResponse, never, Locale | LoggedInUser> = HavingProblemsPage
