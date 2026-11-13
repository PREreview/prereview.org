import type { UrlParams } from 'effect/http'
import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../Domain/DatasetReviews/index.ts'
import * as Prereviewers from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as ChooseYourPersonaForm from './ChooseYourPersonaForm.ts'
import { ChooseYourPersonaPage as MakeResponse } from './ChooseYourPersonaPage.ts'

export const ChooseYourPersonaPage: (input: {
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser | Prereviewers.Prereviewers
> = Effect.fn('ReviewADatasetFlow.ChooseYourPersonaPage')(
  function* ({ datasetReviewId }) {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const currentPersona = yield* DatasetReviews.checkIfUserCanChoosePersona({
      datasetReviewId,
      userId: user.orcid,
    })

    const form = ChooseYourPersonaForm.fromPersona(currentPersona)

    const publicPersona = yield* Prereviewers.getPublicPersona(user.orcid)
    const pseudonymPersona = yield* Prereviewers.getPseudonymPersona(user.orcid)

    return MakeResponse({ datasetReviewId, form, publicPersona, pseudonymPersona, locale })
  },
  (effect, { datasetReviewId }) =>
    Effect.catchTags(effect, {
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

export const ChooseYourPersonaSubmission: (input: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<
  Response.Response,
  never,
  | DatasetReviews.DatasetReviewCommands
  | DatasetReviews.DatasetReviewQueries
  | Locale
  | LoggedInUser
  | Prereviewers.Prereviewers
> = Effect.fn('ReviewADatasetFlow.ChooseYourPersonaSubmission')(function* ({ body, datasetReviewId }) {
  const user = yield* LoggedInUser
  const locale = yield* Locale

  const form = yield* ChooseYourPersonaForm.fromBody(body)

  return yield* Match.valueTags(form, {
    CompletedForm: Effect.fnUntraced(
      function* (form: ChooseYourPersonaForm.CompletedForm) {
        yield* DatasetReviews.choosePersona({
          persona: form.chooseYourPersona,
          datasetReviewId,
          userId: user.orcid,
        })

        const nextExpectedCommand = yield* Effect.flatMap(
          DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
          Effect.fromOption,
        )

        return Response.RedirectResponse({
          location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
        })
      },
      Effect.catch(() => HavingProblemsPage),
    ),
    InvalidForm: Effect.fnUntraced(
      function* (form: ChooseYourPersonaForm.InvalidForm) {
        const publicPersona = yield* Prereviewers.getPublicPersona(user.orcid)
        const pseudonymPersona = yield* Prereviewers.getPseudonymPersona(user.orcid)

        return MakeResponse({ datasetReviewId, form, publicPersona, pseudonymPersona, locale })
      },
      Effect.catchTag('UnableToGetPersona', () => HavingProblemsPage),
    ),
  })
})
