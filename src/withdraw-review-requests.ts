import { NodeRuntime } from '@effect/platform-node'
import { Console, pipe } from 'effect'

const program = Console.log('Withdrawing review requests')

pipe(program, NodeRuntime.runMain)
