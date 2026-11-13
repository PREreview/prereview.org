import type { UrlParams } from 'effect/http'
import { Effect, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { ResearchInterestsStore } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { ResearchInterestsPage as CreatePage } from './ResearchInterestsPage.ts'
import * as ResearchInterestsForm from './ResearchInterestsForm.ts'

export const ResearchInterestsPage: Effect.Effect<
  Response,
  never,
  ResearchInterestsStore.Store | Locale | LoggedInUser
> = Effect.gen(function* () {
  const locale = yield* Locale
  const user = yield* LoggedInUser

  const researchInterests = yield* Effect.option(ResearchInterestsStore.get(user.orcid))

  return CreatePage(researchInterests, locale)
}).pipe(Effect.withSpan('MyDetails.ResearchInterestsPage'))

export const ResearchInterestsSubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, ResearchInterestsStore.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.ResearchInterestsSubmission',
)(
  function* (body) {
    const form = yield* ResearchInterestsForm.fromBody(body)
    const user = yield* LoggedInUser

    if (form._tag === 'EmptyForm') {
      yield* ResearchInterestsStore.remove(user.orcid)

      return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
    }

    const visibility = yield* pipe(
      ResearchInterestsStore.get(user.orcid),
      Effect.map(Struct.get('visibility')),
      Effect.catchTag('ResearchInterestsNotFound', () => Effect.succeed('restricted' as const)),
    )

    yield* ResearchInterestsStore.save(user.orcid, { value: form.researchInterests, visibility })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTag('ResearchInterestsUnavailable', () => HavingProblemsPage),
)
