import { Cause, Effect, Layer } from 'effect'
import { WorkflowEngine } from 'effect/workflow'

export const layer: Layer.Layer<WorkflowEngine.WorkflowEngine, never, WorkflowEngine.WorkflowEngine> = Layer.effect(
  WorkflowEngine.WorkflowEngine,
  Effect.gen(function* () {
    const engine = yield* WorkflowEngine.WorkflowEngine

    return WorkflowEngine.WorkflowEngine.of({
      ...engine,
      register: (workflow, execute) =>
        engine.register(workflow, (payload, executionId) =>
          execute(payload, executionId).pipe(
            Effect.onError(cause =>
              Cause.hasDies(cause)
                ? Effect.logError('Workflow died').pipe(
                    Effect.annotateLogs({ workflow: workflow._tag, executionId, cause: Cause.pretty(cause) }),
                  )
                : Effect.void,
            ),
          ),
        ),
    })
  }),
)
