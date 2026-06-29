import { Command } from '@effect/cli'
import { Console, Effect } from 'effect'

const program = Effect.gen(function* () {
  yield* Console.log('Done')
})

export const ImportContactAddresses = Command.make('import-contact-addresses', {}, () => program)
