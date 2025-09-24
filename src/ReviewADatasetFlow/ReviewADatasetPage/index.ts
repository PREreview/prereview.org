import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import type { Locale } from '../../Context.js'
import * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { NotADatasetPage } from './NotADatasetPage.js'
import * as ReviewADatasetForm from './ReviewADatasetForm.js'
import { ReviewADatasetPage as MakeResponse } from './ReviewADatasetPage.js'
import { UnknownDatasetPage } from './UnknownDatasetPage.js'
import { UnsupportedDoiPage } from './UnsupportedDoiPage.js'
import { UnsupportedUrlPage } from './UnsupportedUrlPage.js'

export const ReviewADatasetPage: Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> = Effect.succeed(
  MakeResponse({ form: new ReviewADatasetForm.EmptyForm() }),
)

export const ReviewADatasetSubmission = ({
  body,
}: {
  body: UrlParams.UrlParams
}): Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> =>
  Effect.gen(function* () {
    const form = yield* ReviewADatasetForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fn(
        function* (form: ReviewADatasetForm.CompletedForm) {
          const datasetId = yield* Effect.andThen(
            Datasets.parseDatasetIdInput(form.whichDataset),
            Datasets.resolveDatasetId,
          )

          return Response.RedirectResponse({
            location: Routes.ReviewThisDataset.href({ datasetId }),
          })
        },
        Effect.catchTags({
          DatasetIsNotFound: error => Effect.succeed(UnknownDatasetPage({ dataset: error.datasetId })),
          DatasetIsUnavailable: () => HavingProblemsPage,
          UnsupportedDoi: () => Effect.succeed(UnsupportedDoiPage()),
          UnsupportedUrl: () => Effect.succeed(UnsupportedUrlPage()),
          NotADataset: () => Effect.succeed(NotADatasetPage()),
        }),
      ),
      InvalidForm: form => Effect.succeed(MakeResponse({ form })),
    })
  })
