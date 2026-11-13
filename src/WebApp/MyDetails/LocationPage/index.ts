import type { UrlParams } from 'effect/http'
import { Effect, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { Locations } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { LocationPage as CreatePage } from './LocationPage.ts'
import * as LocationForm from './LocationForm.ts'

export const LocationPage: Effect.Effect<Response, never, Locations.Store | Locale | LoggedInUser> = Effect.gen(
  function* () {
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const location = yield* Effect.option(Locations.get(user.orcid))

    return CreatePage(location, locale)
  },
).pipe(Effect.withSpan('MyDetails.LocationPage'))

export const LocationSubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, Locations.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.LocationSubmission',
)(
  function* (body) {
    const form = yield* LocationForm.fromBody(body)
    const user = yield* LoggedInUser

    if (form._tag === 'EmptyForm') {
      yield* Locations.remove(user.orcid)

      return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
    }

    const visibility = yield* pipe(
      Locations.get(user.orcid),
      Effect.map(Struct.get('visibility')),
      Effect.catchTag('LocationNotFound', () => Effect.succeed('restricted' as const)),
    )

    yield* Locations.save(user.orcid, { value: form.location, visibility })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTag('LocationUnavailable', () => HavingProblemsPage),
)
