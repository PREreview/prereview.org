import type { UrlParams } from 'effect/http'
import { Effect, Option, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { CareerStages } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { CareerStagePage as CreatePage } from './CareerStagePage.ts'
import * as CareerStageForm from './CareerStageForm.ts'

export const CareerStagePage: Effect.Effect<Response, never, CareerStages.Store | Locale | LoggedInUser> = Effect.gen(
  function* () {
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const careerStage = yield* Effect.option(CareerStages.get(user.orcid))

    return CreatePage({ careerStage, locale })
  },
).pipe(Effect.withSpan('MyDetails.CareerStagePage'))

export const CareerStageSubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, CareerStages.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.CareerStageSubmission',
)(
  function* (body) {
    const form = yield* CareerStageForm.fromBody(body)

    if (form._tag === 'InvalidForm') {
      const locale = yield* Locale

      return CreatePage({ careerStage: Option.none(), error: true, locale })
    }

    const user = yield* LoggedInUser

    if (form.careerStage === 'skip') {
      yield* CareerStages.remove(user.orcid)

      return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
    }

    const visibility = yield* pipe(
      CareerStages.get(user.orcid),
      Effect.map(Struct.get('visibility')),
      Effect.catchTag('CareerStageNotFound', () => Effect.succeed('restricted' as const)),
    )

    yield* CareerStages.save(user.orcid, { value: form.careerStage, visibility })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTag('CareerStageUnavailable', () => HavingProblemsPage),
)
