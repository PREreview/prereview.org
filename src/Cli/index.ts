import { pipe } from 'effect'
import { Command } from 'effect/cli'
import { AddDatasetReviewToClub } from './AddDatasetReviewToClub.ts'
import { AddPreprintReviewToClub } from './AddPreprintReviewToClub.ts'
import { CategorizeReviewRequest } from './CategorizeReviewRequest.ts'
import { ImportPreprintReviews } from './ImportPreprintReviews.ts'
import { PopulateRequestEmbeddings } from './PopulateRequestEmbeddings.ts'
import { PrintStatus } from './PrintStatus.ts'
import { RetryPublishDatasetReview } from './RetryPublishDatasetReview.ts'
import { WithdrawComment } from './WithdrawComment.ts'
import { WithdrawReviewRequest } from './WithdrawReviewRequest.ts'

const app = pipe(
  Command.make('prereview', {}),
  Command.withSubcommands([
    PrintStatus,
    WithdrawReviewRequest,
    CategorizeReviewRequest,
    AddDatasetReviewToClub,
    AddPreprintReviewToClub,
    PopulateRequestEmbeddings,
    ImportPreprintReviews,
    RetryPublishDatasetReview,
    WithdrawComment,
  ]),
)

export const Cli = Command.runWith(app, { version: 'latest' })
