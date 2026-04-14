import { Array, Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { Temporal } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn, toPersonas } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import {
  LogInResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import { CheckYourRequestPage as MakeResponse } from './CheckYourRequestPage.ts'
import { FailureMessage } from './FailureMessage.ts'

export const CheckYourRequestPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse,
  never,
  ReviewRequests.ReviewRequestQueries | Preprints.Preprints | Locale
> = Effect.fn('RequestAReviewFlow.CheckYourRequestPage')(
  function* ({ preprintId }) {
    const user = yield* EnsureUserIsLoggedIn
    const locale = yield* Locale

    const preprint = yield* Preprints.getPreprintTitle(preprintId)

    const reviewRequest = yield* ReviewRequests.getReviewRequestReadyToBePublished({
      requesterId: user.orcid,
      preprintId: preprint.id,
    }).pipe(Effect.let('persona', ({ personaChoice }) => toPersonas(user)[`${personaChoice}Persona`]))

    return MakeResponse({ preprint: preprint.id, reviewRequest, locale })
  },
  (error, { preprintId }) =>
    Effect.catchTags(error, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      ReviewRequestHasBeenPublished: () =>
        Effect.succeed(RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId }) })),
      ReviewRequestNotReadyToBePublished: () =>
        Effect.succeed(RedirectResponse({ location: Routes.RequestAReviewChooseYourPersona.href({ preprintId }) })),
      UnableToQuery: () => HavingProblemsPage,
      UnknownReviewRequest: () => PageNotFound,
      UserIsNotLoggedIn: () =>
        Effect.succeed(LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }) })),
    }),
)

export const CheckYourRequestSubmission: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse,
  never,
  ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries | Preprints.Preprints | Locale
> = Effect.fn('RequestAReviewFlow.CheckYourRequestSubmission')(
  function* ({ preprintId }) {
    const user = yield* EnsureUserIsLoggedIn

    const preprint = yield* Preprints.getPreprintTitle(preprintId)

    const { reviewRequestId } = yield* ReviewRequests.getReviewRequestReadyToBePublished({
      requesterId: user.orcid,
      preprintId: preprint.id,
    })

    const publishedAt = yield* Temporal.currentInstant

    yield* ReviewRequests.publishReviewRequest({ publishedAt, reviewRequestId })

    return RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId: preprint.id }) })
  },
  (error, { preprintId }) =>
    Effect.catchTags(error, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => Effect.andThen(Locale, FailureMessage),
      ReviewRequestHasBeenPublished: () =>
        Effect.succeed(RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId }) })),
      ReviewRequestNotReadyToBePublished: error =>
        Effect.succeed(
          RedirectResponse({ location: routeForMissing[Array.headNonEmpty(error.missing)].href({ preprintId }) }),
        ),
      UnableToHandleCommand: () => Effect.andThen(Locale, FailureMessage),
      UnableToQuery: () => Effect.andThen(Locale, FailureMessage),
      UnknownReviewRequest: () => PageNotFound,
      UserIsNotLoggedIn: () =>
        Effect.succeed(LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId }) })),
    }),
)

const routeForMissing = {
  PersonaForAReviewRequestForAPreprintWasChosen: Routes.RequestAReviewChooseYourPersona,
} satisfies Record<
  ReviewRequests.ReviewRequestNotReadyToBePublished['missing'][number],
  Routes.Route<{ preprintId: Preprints.IndeterminatePreprintId }>
>
