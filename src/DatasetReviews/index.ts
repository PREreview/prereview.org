import { Layer } from 'effect'
import * as Commands from './Commands/index.ts'
import * as Queries from './Queries/index.ts'
import * as Workflows from './Workflows/index.ts'

export * from './Commands/index.ts'
export * from './Errors.ts'
export * from './Events.ts'
export * from './Queries/index.ts'
export * from './Reactions.ts'
export * from './Workflows/index.ts'

export const layer = Layer.provideMerge(
  Workflows.workflowsLayer,
  Layer.mergeAll(Commands.commandsLayer, Queries.queriesLayer),
)
