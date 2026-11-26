import { Cause, Context, Effect, Exit, Layer, Option } from 'effect'
import { Workflow, WorkflowEngine } from 'effect/workflow'

export const layer: Layer.Layer<WorkflowEngine.WorkflowEngine, never, WorkflowEngine.WorkflowEngine> = Layer.effect(
  WorkflowEngine.WorkflowEngine,
  Effect.gen(function* () {
    const engine = yield* WorkflowEngine.WorkflowEngine

    return WorkflowEngine.WorkflowEngine.of({
      ...engine,
      register: (workflow, execute) =>
        engine.register(workflow, (payload, executionId) =>
          execute(payload, executionId).pipe(
            Effect.onExit(exit =>
              Effect.gen(function* () {
                if (Exit.isSuccess(exit)) {
                  return
                }

                const annotations = { workflow: workflow._tag, executionId }

                if (Cause.hasDies(exit.cause)) {
                  return yield* Effect.logError('Workflow died').pipe(
                    Effect.annotateLogs({ ...annotations, cause: Cause.pretty(exit.cause) }),
                  )
                }

                if (!Context.get(workflow.annotations, Workflow.SuspendOnFailure)) {
                  return
                }

                // The workflow body itself failed; `intoResult` will turn this into a suspension.
                if (!Cause.hasInterruptsOnly(exit.cause)) {
                  return yield* Effect.logError('Workflow suspended after failure').pipe(
                    Effect.annotateLogs({ ...annotations, cause: Cause.pretty(exit.cause) }),
                  )
                }

                // An activity failed and was turned into a suspension, which interrupts the body.
                const instance = yield* Effect.serviceOption(WorkflowEngine.WorkflowInstance)

                if (Option.isSome(instance) && instance.value.failed) {
                  yield* Effect.logError('Workflow suspended after failure').pipe(
                    Effect.annotateLogs({
                      ...annotations,
                      cause: instance.value.cause ? Cause.pretty(instance.value.cause) : undefined,
                    }),
                  )
                }
              }),
            ),
          ),
        ),
    })
  }),
)
