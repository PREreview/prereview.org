import { Command } from '@effect/cli'
import { pipe } from 'effect'
import { AddDatasetReviewToClub } from './AddDatasetReviewToClub.ts'
import { CategorizeReviewRequest } from './CategorizeReviewRequest.ts'
import { PrintStatus } from './PrintStatus.ts'
import { WithdrawReviewRequest } from './WithdrawReviewRequest.ts'

const app = pipe(
  Command.make('prereview', {}),
  Command.withSubcommands([PrintStatus, WithdrawReviewRequest, CategorizeReviewRequest, AddDatasetReviewToClub]),
)

export const Cli = Command.run(app, {
  name: 'PREreview',
  version: 'latest',
})
