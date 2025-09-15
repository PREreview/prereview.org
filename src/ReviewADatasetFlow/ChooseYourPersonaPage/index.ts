import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Personas from '../../Personas/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import { RouteForCommand } from '../RouteForCommand.js'
import * as ChooseYourPersonaForm from './ChooseYourPersonaForm.js'
import { ChooseYourPersonaPage as MakeResponse } from './ChooseYourPersonaPage.js'

export const ChooseYourPersonaPage = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser | Personas.Personas
> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const currentPersona = yield* DatasetReviews.checkIfUserCanChoosePersona({
      datasetReviewId,
      userId: user.orcid,
    })

    const form = ChooseYourPersonaForm.fromPersona(currentPersona)

    const publicPersona = yield* Personas.getPublicPersona(user.orcid)
    const pseudonymPersona = yield* Personas.getPseudonymPersona(user.orcid)

    return MakeResponse({ datasetReviewId, form, publicPersona, pseudonymPersona })
  }).pipe(
    Effect.catchTags({
      DatasetReviewHasNotBeenStarted: () => PageNotFound,
      DatasetReviewHasBeenPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewIsBeingPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewWasStartedByAnotherUser: () => PageNotFound,
      UnableToGetPersona: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )

export const ChooseYourPersonaSubmission = ({
  body,
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser | Personas.Personas
> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser

    const form = yield* ChooseYourPersonaForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fn(
        function* (form: ChooseYourPersonaForm.CompletedForm) {
          yield* DatasetReviews.choosePersona({
            persona: form.chooseYourPersona,
            datasetReviewId,
            userId: user.orcid,
          })

          const nextExpectedCommand = yield* Effect.flatten(
            DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
          )

          return Response.RedirectResponse({
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
          })
        },
        Effect.catchAll(() => HavingProblemsPage),
      ),
      InvalidForm: Effect.fn(
        function* (form: ChooseYourPersonaForm.InvalidForm) {
          const publicPersona = yield* Personas.getPublicPersona(user.orcid)
          const pseudonymPersona = yield* Personas.getPseudonymPersona(user.orcid)

          return MakeResponse({ datasetReviewId, form, publicPersona, pseudonymPersona })
        },
        Effect.catchTag('UnableToGetPersona', () => HavingProblemsPage),
      ),
    })
  })
