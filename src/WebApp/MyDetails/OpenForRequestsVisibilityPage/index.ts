import type { UrlParams } from 'effect/http'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { IsOpenForRequestsStore } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import * as OpenForRequestsVisibilityForm from './OpenForRequestsVisibilityForm.ts'
import { OpenForRequestsVisibilityPage as CreatePage } from './OpenForRequestsVisibilityPage.ts'

export const OpenForRequestsVisibilityPage: Effect.Effect<
  Response,
  never,
  IsOpenForRequestsStore.Store | Locale | LoggedInUser
> = Effect.gen(function* () {
  const locale = yield* Locale
  const user = yield* LoggedInUser

  const openForRequests = yield* IsOpenForRequestsStore.get(user.orcid)

  if (!openForRequests.value) {
    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  }

  return CreatePage({ locale, openForRequests })
}).pipe(
  Effect.catchTags({
    IsOpenForRequestsNotFound: () =>
      Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    IsOpenForRequestsUnavailable: () => HavingProblemsPage,
  }),
  Effect.withSpan('MyDetails.OpenForRequestsVisibilityPage'),
)

export const OpenForRequestsVisibilitySubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, IsOpenForRequestsStore.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.OpenForRequestsVisibilitySubmission',
)(
  function* (body) {
    const form = yield* OpenForRequestsVisibilityForm.fromBody(body)
    const user = yield* LoggedInUser

    const openForRequests = yield* IsOpenForRequestsStore.get(user.orcid)

    if (!openForRequests.value) {
      return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
    }

    yield* IsOpenForRequestsStore.save(user.orcid, {
      ...openForRequests,
      visibility: form.openForRequestsVisibility,
    })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTags({
    IsOpenForRequestsNotFound: () =>
      Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    IsOpenForRequestsUnavailable: () => HavingProblemsPage,
  }),
)
