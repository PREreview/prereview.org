import { Command } from '@effect/cli'
import { Console, Effect, Schema, Stream, String } from 'effect'
import { Prereviewers } from '../Prereviewers/index.ts'
import { OrcidId, Pseudonym, Temporal } from '../types/index.ts'

const PrereviewerSchema = Schema.Struct({
  orcidId: OrcidId.OrcidIdSchema,
  pseudonym: Pseudonym.PseudonymSchema,
})

const program = Effect.fnUntraced(function* () {
  const prereviewers = yield* Prereviewers

  const stdinStream = Stream.fromAsyncIterable(
    process.stdin as AsyncIterable<string>,
    () => new Error('Failed to read from stdin'),
  )

  const input = yield* Stream.runFold(stdinStream, '', String.concat)

  const decoded = yield* Schema.decode(Schema.parseJson(Schema.Array(PrereviewerSchema)))(input)

  yield* Effect.forEach(decoded, ({ orcidId, pseudonym }) =>
    Effect.gen(function* () {
      const replacedAt = yield* Temporal.currentInstant

      yield* prereviewers.replaceLegacyPseudonym({ orcidId, pseudonym, replacedAt })
    }),
  )
}, Effect.tapError(Console.log))

export const ReplaceLegacyPseudonyms = Command.make('replace-legacy-pseudonyms', {}, program)
