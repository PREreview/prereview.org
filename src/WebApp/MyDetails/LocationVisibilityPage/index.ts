import type { UrlParams } from 'effect/http'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { Locations } from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import * as LocationVisibilityForm from './LocationVisibilityForm.ts'
import { LocationVisibilityPage as CreatePage } from './LocationVisibilityPage.ts'

export const LocationVisibilityPage: Effect.Effect<Response, never, Locations.Store | Locale | LoggedInUser> =
  Effect.gen(function* () {
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const location = yield* Locations.get(user.orcid)

    return CreatePage({ location, locale })
  }).pipe(
    Effect.catchTags({
      LocationNotFound: () =>
        Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
      LocationUnavailable: () => HavingProblemsPage,
    }),
    Effect.withSpan('MyDetails.LocationVisibilityPage'),
  )

export const LocationVisibilitySubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, Locations.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.LocationVisibilitySubmission',
)(
  function* (body) {
    const form = yield* LocationVisibilityForm.fromBody(body)
    const user = yield* LoggedInUser

    const location = yield* Locations.get(user.orcid)

    yield* Locations.save(user.orcid, { ...location, visibility: form.locationVisibility })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTags({
    LocationNotFound: () => Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    LocationUnavailable: () => HavingProblemsPage,
  }),
)
