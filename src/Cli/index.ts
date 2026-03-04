import { Command } from '@effect/cli'
import { pipe } from 'effect'
import { PrintStatus } from './PrintStatus.ts'
import { WithdrawReviewRequests } from './WithdrawReviewRequests.ts'

const withdrawReviewRequests = Command.make('withdraw-review-requests', {}, () => WithdrawReviewRequests)

const status = Command.make('status', {}, () => PrintStatus)

const app = pipe(Command.make('prereview', {}), Command.withSubcommands([status, withdrawReviewRequests]))

export const Cli = Command.run(app, {
  name: 'PREreview',
  version: 'latest',
})
