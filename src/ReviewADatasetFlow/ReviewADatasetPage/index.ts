import type { UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import type { Locale } from '../../Context.js'
import type * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import type * as Response from '../../response.js'
import * as ReviewADatasetForm from './ReviewADatasetForm.js'
import { ReviewADatasetPage as MakeResponse } from './ReviewADatasetPage.js'

export const ReviewADatasetPage: Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> = Effect.succeed(
  MakeResponse({ form: new ReviewADatasetForm.EmptyForm() }),
)

export const ReviewADatasetSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
}: {
  body: UrlParams.UrlParams
}): Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> => HavingProblemsPage
