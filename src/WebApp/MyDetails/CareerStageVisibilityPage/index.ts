import type { UrlParams } from 'effect/http'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { CareerStages } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import * as CareerStageVisibilityForm from './CareerStageVisibilityForm.ts'
import { CareerStageVisibilityPage as CreatePage } from './CareerStageVisibilityPage.ts'

export const CareerStageVisibilityPage: Effect.Effect<Response, never, CareerStages.Store | Locale | LoggedInUser> =
  Effect.gen(function* () {
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const careerStage = yield* CareerStages.get(user.orcid)

    return CreatePage({ careerStage, locale })
  }).pipe(
    Effect.catchTags({
      CareerStageNotFound: () =>
        Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
      CareerStageUnavailable: () => HavingProblemsPage,
    }),
    Effect.withSpan('MyDetails.CareerStageVisibilityPage'),
  )

export const CareerStageVisibilitySubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, CareerStages.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.CareerStageVisibilitySubmission',
)(
  function* (body) {
    const form = yield* CareerStageVisibilityForm.fromBody(body)
    const user = yield* LoggedInUser

    const careerStage = yield* CareerStages.get(user.orcid)

    yield* CareerStages.save(user.orcid, {
      ...careerStage,
      visibility: form.careerStageVisibility,
    })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTags({
    CareerStageNotFound: () =>
      Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    CareerStageUnavailable: () => HavingProblemsPage,
  }),
)
