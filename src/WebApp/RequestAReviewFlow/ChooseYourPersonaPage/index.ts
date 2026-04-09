import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import {
  LogInResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as ChooseYourPersonaForm from './ChooseYourPersonaForm.ts'
import { ChooseYourPersonaPage as MakeResponse } from './ChooseYourPersonaPage.ts'

export const ChooseYourPersonaPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse,
  never,
  ReviewRequests.ReviewRequestQueries | Preprints.Preprints | Locale
> = Effect.fn('RequestAReviewFlow.ChooseYourPersonaPage')(
  function* ({ preprintId }) {
    const user = yield* EnsureUserIsLoggedIn
    const locale = yield* Locale

    const preprint = yield* Preprints.getPreprintTitle(preprintId)

    const reviewRequest = yield* ReviewRequests.getPersonaChoice({ requesterId: user.orcid, preprintId: preprint.id })

    const form = ChooseYourPersonaForm.fromPersonaChoice(reviewRequest.personaChoice)

    return MakeResponse({ form, preprint: preprint.id, user, locale })
  },
  (error, { preprintId }) =>
    Effect.catchTags(error, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      ReviewRequestHasBeenPublished: () =>
        Effect.succeed(RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId }) })),
      UnableToQuery: () => HavingProblemsPage,
      UnknownReviewRequest: () => PageNotFound,
      UserIsNotLoggedIn: () =>
        Effect.succeed(LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }) })),
    }),
)

export const ChooseYourPersonaSubmission: ({
  body,
  preprintId,
}: {
  body: UrlParams.UrlParams
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse,
  never,
  ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries | Preprints.Preprints | Locale
> = Effect.fn('RequestAReviewFlow.ChooseYourPersonaSubmission')(
  function* ({ body, preprintId }) {
    const user = yield* EnsureUserIsLoggedIn
    const locale = yield* Locale

    const preprint = yield* Preprints.getPreprintTitle(preprintId)

    const reviewRequest = yield* ReviewRequests.getPersonaChoice({ requesterId: user.orcid, preprintId: preprint.id })

    const form = yield* ChooseYourPersonaForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fnUntraced(function* (form: ChooseYourPersonaForm.CompletedForm) {
        yield* ReviewRequests.choosePersona({
          persona: form.chooseYourPersona,
          reviewRequestId: reviewRequest.reviewRequestId,
        })

        const nextExpectedCommand = yield* ReviewRequests.getNextExpectedCommandForAUserOnAReviewRequest({
          reviewRequestId: reviewRequest.reviewRequestId,
        })

        return RedirectResponse({ location: RouteForCommand(nextExpectedCommand).href({ preprintId: preprint.id }) })
      }),
      InvalidForm: form => Effect.succeed(MakeResponse({ form, preprint: preprint.id, user, locale })),
    })
  },
  (error, { preprintId }) =>
    Effect.catchTags(error, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      ReviewRequestHasBeenPublished: () =>
        Effect.succeed(RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId }) })),
      UnableToHandleCommand: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UnknownReviewRequest: () => PageNotFound,
      UserIsNotLoggedIn: () =>
        Effect.succeed(LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }) })),
    }),
)
