import { Command } from 'effect/cli'
import { Console, Effect } from 'effect'

const program = Effect.fnUntraced(function* () {
  yield* Console.log('importing preprint reviews')
})

export const ImportPreprintReviews = Command.make('import-preprint-reviews', {}, program)
