import type { UrlParams } from '@effect/platform'
import { Effect, Match, pipe } from 'effect'
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

export const RequestedReviewNotificationsSubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, Locale | LoggedInUser> = Effect.fn(
  'MyDetails.RequestedReviewNotificationsSubmission',
)(function* (body) {
  const form = yield* RequestedReviewNotificationsForm.fromBody(body)

  return yield* Match.valueTags(form, {
    CompletedForm: () => HavingProblemsPage,
    InvalidForm: Effect.fnUntraced(function* (form: RequestedReviewNotificationsForm.InvalidForm) {
      const locale = yield* Locale

      return CreatePage({ locale, form })
    }),
  })
})
