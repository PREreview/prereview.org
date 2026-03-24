import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import * as Datasets from '../../../Datasets/index.ts'
import * as Routes from '../../../routes.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import * as Response from '../../Response/index.ts'
import { NotADatasetPage } from './NotADatasetPage.ts'
import * as ReviewADatasetForm from './ReviewADatasetForm.ts'
import { ReviewADatasetPage as MakeResponse } from './ReviewADatasetPage.ts'
import { UnknownDatasetPage } from './UnknownDatasetPage.ts'
import { UnsupportedDoiPage } from './UnsupportedDoiPage.ts'
import { UnsupportedUrlPage } from './UnsupportedUrlPage.ts'

export const ReviewADatasetPage: Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> = Effect.andThen(
  Locale,
  locale => MakeResponse({ form: new ReviewADatasetForm.EmptyForm(), locale }),
)

export const ReviewADatasetSubmission = ({
  body,
}: {
  body: UrlParams.UrlParams
}): Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> =>
  Effect.gen(function* () {
    const locale = yield* Locale

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
          DatasetIsNotFound: error => Effect.succeed(UnknownDatasetPage({ dataset: error.datasetId, locale })),
          DatasetIsUnavailable: () => HavingProblemsPage,
          UnsupportedDoi: () => Effect.succeed(UnsupportedDoiPage({ locale })),
          UnsupportedUrl: () => Effect.succeed(UnsupportedUrlPage()),
          NotADataset: () => Effect.succeed(NotADatasetPage()),
        }),
      ),
      InvalidForm: form => Effect.succeed(MakeResponse({ form, locale })),
    })
  })
