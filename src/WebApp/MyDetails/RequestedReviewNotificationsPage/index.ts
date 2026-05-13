import type { UrlParams } from '@effect/platform'
import { Effect, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { Prereviewers } from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
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
) => Effect.Effect<Response, never, Locale | LoggedInUser | Prereviewers> = Effect.fn(
  'MyDetails.RequestedReviewNotificationsSubmission',
)(
  function* (body) {
    const form = yield* RequestedReviewNotificationsForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fnUntraced(function* (form: RequestedReviewNotificationsForm.CompletedForm) {
        const prereviewers = yield* Prereviewers
        const user = yield* LoggedInUser

        if (form.requestedReviewNotifications === 'yes') {
          yield* prereviewers.optInToNotificationsForReviewsPublishedInResponseToRequests(user.orcid)
        } else {
          yield* prereviewers.optOutOfNotificationsForReviewsPublishedInResponseToRequests(user.orcid)
        }

        return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
      }),
      InvalidForm: Effect.fnUntraced(function* (form: RequestedReviewNotificationsForm.InvalidForm) {
        const locale = yield* Locale

        return CreatePage({ locale, form })
      }),
    })
  },
  Effect.catchTag('PrereviewerHasNotOptedIn', 'UnableToHandleCommand', 'UnknownPrereviewer', () => HavingProblemsPage),
)
