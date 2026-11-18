import { pipe } from 'effect'
import { Command } from 'effect/cli'
import { AddDatasetReviewToClub } from './AddDatasetReviewToClub.ts'
import { CategorizeReviewRequest } from './CategorizeReviewRequest.ts'
import { ImportPreprintReviews } from './ImportPreprintReviews.ts'
import { PopulateRequestEmbeddings } from './PopulateRequestEmbeddings.ts'
import { PrintStatus } from './PrintStatus.ts'
import { WithdrawReviewRequest } from './WithdrawReviewRequest.ts'

const app = pipe(
  Command.make('prereview', {}),
  Command.withSubcommands([
    PrintStatus,
    WithdrawReviewRequest,
    CategorizeReviewRequest,
    AddDatasetReviewToClub,
    PopulateRequestEmbeddings,
    ImportPreprintReviews,
  ]),
)

export const Cli = Command.runWith(app, { version: 'latest' })
