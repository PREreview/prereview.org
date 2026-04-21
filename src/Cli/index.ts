import { Command } from '@effect/cli'
import { pipe } from 'effect'
import { CategorizeReviewRequest } from './CategorizeReviewRequest.ts'
import { ImportPrereviewer } from './ImportPrereviewer.ts'
import { PrintStatus } from './PrintStatus.ts'
import { WithdrawReviewRequest } from './WithdrawReviewRequest.ts'

const app = pipe(
  Command.make('prereview', {}),
  Command.withSubcommands([PrintStatus, WithdrawReviewRequest, CategorizeReviewRequest, ImportPrereviewer]),
)

export const Cli = Command.run(app, {
  name: 'PREreview',
  version: 'latest',
})
