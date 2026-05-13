import type { UrlParams } from '@effect/platform'
import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'

export const RequestedReviewNotificationsPage: Effect.Effect<Response, never, Locale | LoggedInUser> =
  HavingProblemsPage

export const RequestedReviewNotificationsSubmission = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body: UrlParams.UrlParams,
): Effect.Effect<Response, never, Locale | LoggedInUser> => HavingProblemsPage
