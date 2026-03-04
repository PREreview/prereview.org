import { Command } from '@effect/cli'
import { pipe } from 'effect'
import { PrintStatus } from './PrintStatus.ts'
import { WithdrawReviewRequest } from './WithdrawReviewRequest.ts'

const app = pipe(Command.make('prereview', {}), Command.withSubcommands([PrintStatus, WithdrawReviewRequest]))

export const Cli = Command.run(app, {
  name: 'PREreview',
  version: 'latest',
})
