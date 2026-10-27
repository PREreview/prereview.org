import type { UrlParams } from '@effect/platform'
import { Effect, Match, Option } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { PreprintReviews } from '../../../PreprintReviews/index.ts'
import { Preprints, type IndeterminatePreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as UseOfAiForm from './UseOfAiForm.ts'
import { renderUseOfAiPage } from './UseOfAiPage.ts'

export const UseOfAiPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale | LoggedInUser | Preprints | PreprintReviews> = Effect.fn(
  'ReviewAPreprintFlow.UseOfAiPage',
)(
  function* ({ preprintId }) {
    const locale = yield* Locale
    const user = yield* LoggedInUser
    const preprints = yield* Preprints
    const preprintReviews = yield* PreprintReviews

    const preprint = yield* preprints.getPreprintTitle(preprintId)
    const details = yield* preprintReviews.getUseOfAiDetails({ preprintId: preprint.id, orcidId: user.orcid })

    const form = UseOfAiForm.fromAnswer(details.generativeAiIdeas)

    return renderUseOfAiPage({
      alreadyWritten: details.alreadyWritten,
      form,
      locale,
      moreAuthors: details.moreAuthors,
      preprint,
    })
  },
  (result, { preprintId }) =>
    Effect.catchTags(result, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      PreprintReviewNotFound: () =>
        Effect.succeed(RedirectResponse({ location: format(Routes.writeReviewMatch.formatter, { id: preprintId }) })),
      UnableToQuery: () => HavingProblemsPage,
    }),
)

export const UseOfAiSubmission: ({
  body,
  preprintId,
}: {
  body: UrlParams.UrlParams
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale | LoggedInUser | Preprints | PreprintReviews> = Effect.fn(
  'ReviewAPreprintFlow.UseOfAiSubmission',
)(
  function* ({ body, preprintId }) {
    const locale = yield* Locale
    const user = yield* LoggedInUser
    const preprints = yield* Preprints
    const preprintReviews = yield* PreprintReviews

    const preprint = yield* preprints.getPreprintTitle(preprintId)

    const form = UseOfAiForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fnUntraced(function* (form: UseOfAiForm.CompletedForm) {
        yield* preprintReviews.declareUseOfAi({
          preprintId: preprint.id,
          orcidId: user.orcid,
          generativeAiIdeas: form.generativeAiIdeas,
          generativeAiIdeasDetails: Option.none(),
        })

        const nextExpectedCommand = yield* preprintReviews.getNextExpectedCommand({
          preprintId: preprint.id,
          orcidId: user.orcid,
        })

        return RedirectResponse({ location: RouteForCommand(nextExpectedCommand).href({ preprintId: preprint.id }) })
      }),
      InvalidForm: Effect.fnUntraced(function* (form: UseOfAiForm.InvalidForm) {
        const details = yield* preprintReviews.getUseOfAiDetails({ preprintId: preprint.id, orcidId: user.orcid })

        return renderUseOfAiPage({
          alreadyWritten: details.alreadyWritten,
          form,
          locale,
          moreAuthors: details.moreAuthors,
          preprint,
        })
      }),
    })
  },
  (result, { preprintId }) =>
    Effect.catchTags(result, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      PreprintReviewNotFound: () =>
        Effect.succeed(RedirectResponse({ location: format(Routes.writeReviewMatch.formatter, { id: preprintId }) })),
      UnableToHandleCommand: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
)
