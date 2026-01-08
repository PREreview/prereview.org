import { Terminal } from '@effect/platform'
import { NodeRuntime, NodeTerminal } from '@effect/platform-node'
import { Effect, pipe } from 'effect'

const program = Effect.gen(function* () {
  const terminal = yield* Terminal.Terminal

  yield* terminal.display('Hello, world\n')
})

pipe(program, Effect.provide(NodeTerminal.layer), NodeRuntime.runMain())
