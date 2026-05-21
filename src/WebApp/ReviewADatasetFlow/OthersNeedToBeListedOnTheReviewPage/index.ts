import type { UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import type { Uuid } from '../../../types/index.ts'
import type { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type * as Response from '../../Response/index.ts'
import * as OthersNeedToBeListedForm from './OthersNeedToBeListedForm.ts'
import { OthersNeedToBeListedPage } from './OthersNeedToBeListedPage.ts'

export const OthersNeedToBeListedOnTheReviewPage = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const locale = yield* Locale
    const form = new OthersNeedToBeListedForm.EmptyForm()

    return OthersNeedToBeListedPage({ datasetReviewId, form, locale })
  })

export const OthersNeedToBeListedOnTheReviewSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> => HavingProblemsPage
