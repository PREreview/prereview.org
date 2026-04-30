import { Command } from '@effect/cli'
import { Console, Effect, Schema, Stream, String } from 'effect'
import { Prereviewers } from '../Prereviewers/index.ts'
import { OrcidId } from '../types/index.ts'

const program = Effect.fnUntraced(function* () {
  const prereviewers = yield* Prereviewers

  const stdinStream = Stream.fromAsyncIterable(
    process.stdin as AsyncIterable<string>,
    () => new Error('Failed to read from stdin'),
  )

  const input = yield* Stream.runFold(stdinStream, '', String.concat)

  const decoded = yield* Schema.decode(Schema.parseJson(Schema.Array(OrcidId.OrcidIdSchema)))(input)

  yield* Effect.forEach(decoded, prereviewers.replaceLegacyPseudonym)
}, Effect.tapError(Console.log))

export const ReplaceLegacyPseudonyms = Command.make('replace-legacy-pseudonyms', {}, program)
