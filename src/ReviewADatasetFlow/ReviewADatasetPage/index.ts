import type { UrlParams } from '@effect/platform'
import type { Effect } from 'effect'
import type { Locale } from '../../Context.js'
import type * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import type * as Response from '../../response.js'

export const ReviewADatasetPage: Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> =
  HavingProblemsPage

export const ReviewADatasetSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
}: {
  body: UrlParams.UrlParams
}): Effect.Effect<Response.Response, never, Datasets.Datasets | Locale> => HavingProblemsPage
