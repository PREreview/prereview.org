import { Command } from 'effect/cli'
import { Array, Console, Effect, Schema, Stdio, Stream } from 'effect'

const program = Effect.fnUntraced(function* () {
  const stdio = yield* Stdio.Stdio

  const input = yield* Stream.mkString(Stream.decodeText(stdio.stdin))

  const items = yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Array(Schema.Unknown)))(input)

  yield* Console.log(`importing ${Array.length(items)} preprint reviews`)
})

export const ImportPreprintReviews = Command.make('import-preprint-reviews', {}, program)
