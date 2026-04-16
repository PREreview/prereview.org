import { Context, Effect, Layer } from 'effect'
import type { OrcidId } from '../types/index.ts'

export class Prereviewers extends Context.Tag('Prereviewers')<
  Prereviewers,
  {
    register: (orcidId: OrcidId.OrcidId) => Effect.Effect<void>
    isRegistered: (orcidId: OrcidId.OrcidId) => Effect.Effect<boolean>
  }
>() {}

export const layer = Layer.succeed(Prereviewers, {
  register: () => Effect.void,
  isRegistered: () => Effect.succeed(false),
})
