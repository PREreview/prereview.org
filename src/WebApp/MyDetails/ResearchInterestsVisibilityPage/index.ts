import type { UrlParams } from 'effect/http'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { ResearchInterestsStore } from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import * as ResearchInterestsVisibilityForm from './ResearchInterestsVisibilityForm.ts'
import { ResearchInterestsVisibilityPage as CreatePage } from './ResearchInterestsVisibilityPage.ts'

export const ResearchInterestsVisibilityPage: Effect.Effect<
  Response,
  never,
  ResearchInterestsStore.Store | Locale | LoggedInUser
> = Effect.gen(function* () {
  const locale = yield* Locale
  const user = yield* LoggedInUser

  const researchInterests = yield* ResearchInterestsStore.get(user.orcid)

  return CreatePage({ researchInterests, locale })
}).pipe(
  Effect.catchTags({
    ResearchInterestsNotFound: () =>
      Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    ResearchInterestsUnavailable: () => HavingProblemsPage,
  }),
  Effect.withSpan('MyDetails.ResearchInterestsVisibilityPage'),
)

export const ResearchInterestsVisibilitySubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, ResearchInterestsStore.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.ResearchInterestsVisibilitySubmission',
)(
  function* (body) {
    const form = yield* ResearchInterestsVisibilityForm.fromBody(body)
    const user = yield* LoggedInUser

    const researchInterests = yield* ResearchInterestsStore.get(user.orcid)

    yield* ResearchInterestsStore.save(user.orcid, {
      ...researchInterests,
      visibility: form.researchInterestsVisibility,
    })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTags({
    ResearchInterestsNotFound: () =>
      Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    ResearchInterestsUnavailable: () => HavingProblemsPage,
  }),
)
