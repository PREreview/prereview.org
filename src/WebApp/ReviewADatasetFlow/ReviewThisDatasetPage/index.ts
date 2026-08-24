import { Effect, Option } from 'effect'
import { Locale } from '../../../Context.ts'
import * as Datasets from '../../../Datasets/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import type * as Response from '../../Response/index.ts'
import { ReviewThisDatasetPage as MakeResponse } from './ReviewThisDatasetPage.ts'

export const ReviewThisDatasetPage: ({
  datasetId,
}: {
  datasetId: Datasets.DatasetId
}) => Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> =
  Effect.fn(
    function* ({ datasetId }) {
      const user = yield* Effect.serviceOption(LoggedInUser)
      const locale = yield* Locale

      const dataset = yield* Datasets.getDataset(datasetId)

      return MakeResponse({ dataset, locale, isLoggedIn: Option.isSome(user) })
    },
    Effect.catchTags({
      DatasetIsNotFound: () => PageNotFound,
      DatasetIsUnavailable: () => HavingProblemsPage,
    }),
  )
