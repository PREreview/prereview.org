import { Command } from '@effect/cli'
import { Console, Effect, Stream, String } from 'effect'

const program = Effect.fnUntraced(function* () {
  const stdinStream = Stream.fromAsyncIterable(
    process.stdin as AsyncIterable<string>,
    () => new Error('Failed to read from stdin'),
  )

  const input = yield* Stream.runFold(stdinStream, '', String.concat)

  yield* Console.log(input)
})

export const ImportPrereviewer = Command.make('import-prereviewer', {}, program)
