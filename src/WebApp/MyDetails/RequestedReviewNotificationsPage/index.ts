import type { UrlParams } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { Locale } from '../../../Context.ts'
import type { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'
import * as RequestedReviewNotificationsForm from './RequestedReviewNotificationsForm.ts'
import { RequestedReviewNotificationsPage as CreatePage } from './RequestedReviewNotificationsPage.ts'

export const RequestedReviewNotificationsPage: Effect.Effect<Response, never, Locale | LoggedInUser> = pipe(
  Effect.gen(function* () {
    const locale = yield* Locale
    const form = new RequestedReviewNotificationsForm.EmptyForm()

    return CreatePage({ locale, form })
  }),
  Effect.withSpan('MyDetails.RequestedReviewNotificationsPage'),
)

export const RequestedReviewNotificationsSubmission = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body: UrlParams.UrlParams,
): Effect.Effect<Response, never, Locale | LoggedInUser> => HavingProblemsPage
