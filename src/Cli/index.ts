import { Command } from '@effect/cli'
import { pipe } from 'effect'
import { PrintStatus } from './PrintStatus.ts'

const status = Command.make('status', {}, () => PrintStatus)

const app = pipe(Command.make('prereview', {}), Command.withSubcommands([status]))

export const Cli = Command.run(app, {
  name: 'PREreview',
  version: 'latest',
})
