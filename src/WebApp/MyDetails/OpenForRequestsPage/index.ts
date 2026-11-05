import type { UrlParams } from 'effect/http'
import { Effect, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { IsOpenForRequestsStore } from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { OpenForRequestsPage as CreatePage } from './OpenForRequestsPage.ts'
import * as OpenForRequestsForm from './OpenForRequestsForm.ts'

export const OpenForRequestsPage: Effect.Effect<Response, never, IsOpenForRequestsStore.Store | Locale | LoggedInUser> =
  Effect.gen(function* () {
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const openForRequests = yield* Effect.option(IsOpenForRequestsStore.get(user.orcid))

    return CreatePage({ locale, openForRequests })
  }).pipe(Effect.withSpan('MyDetails.OpenForRequestsPage'))

export const OpenForRequestsSubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, IsOpenForRequestsStore.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.OpenForRequestsSubmission',
)(
  function* (body) {
    const form = yield* OpenForRequestsForm.fromBody(body)

    if (form._tag === 'InvalidForm') {
      const locale = yield* Locale

      return CreatePage({ locale, openForRequests: Option.none(), error: true })
    }

    const user = yield* LoggedInUser

    if (form.openForRequests === 'no') {
      yield* IsOpenForRequestsStore.save(user.orcid, { value: false })

      return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
    }

    const visibility = yield* pipe(
      IsOpenForRequestsStore.get(user.orcid),
      Effect.map(existing => (existing.value ? existing.visibility : ('restricted' as const))),
      Effect.catchTag('IsOpenForRequestsNotFound', () => Effect.succeed('restricted' as const)),
    )

    yield* IsOpenForRequestsStore.save(user.orcid, { value: true, visibility })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTag('IsOpenForRequestsUnavailable', () => HavingProblemsPage),
)
