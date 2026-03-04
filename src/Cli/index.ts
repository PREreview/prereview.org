import { Args, Command } from '@effect/cli'
import { pipe } from 'effect'
import { Uuid } from '../types/index.ts'
import { PrintStatus } from './PrintStatus.ts'
import { WithdrawReviewRequest } from './WithdrawReviewRequest.ts'

const reviewRequestId = pipe(Args.text({ name: 'reviewRequestId' }), Args.withSchema(Uuid.UuidSchema))

const withdrawReviewRequest = Command.make('withdraw-review-request', { reviewRequestId }, WithdrawReviewRequest)

const status = Command.make('status', {}, () => PrintStatus)

const app = pipe(Command.make('prereview', {}), Command.withSubcommands([status, withdrawReviewRequest]))

export const Cli = Command.run(app, {
  name: 'PREreview',
  version: 'latest',
})
