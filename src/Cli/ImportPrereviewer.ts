import { Command } from '@effect/cli'
import { Console, Effect, Schema, Stream, String } from 'effect'
import { OrcidId, Pseudonym, Temporal } from '../types/index.ts'

const PrereviewerSchema = Schema.Struct({
  orcidId: OrcidId.OrcidIdSchema,
  registeredAt: Temporal.InstantSchema,
  pseudonym: Pseudonym.PseudonymSchema,
})

const program = Effect.fnUntraced(function* () {
  const stdinStream = Stream.fromAsyncIterable(
    process.stdin as AsyncIterable<string>,
    () => new Error('Failed to read from stdin'),
  )

  const input = yield* Stream.runFold(stdinStream, '', String.concat)

  const decoded = yield* Schema.decode(Schema.parseJson(Schema.Array(PrereviewerSchema)))(input)

  yield* Console.log(decoded)
})

export const ImportPrereviewer = Command.make('import-prereviewer', {}, program)
