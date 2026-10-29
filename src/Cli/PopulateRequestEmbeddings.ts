import { Command } from '@effect/cli'
import { Effect, Console } from 'effect'

const program = Effect.fnUntraced(function* () {
  yield* Console.log('Populating')
})

export const PopulateRequestEmbeddings = Command.make('populate-request-embeddings', {}, program)
