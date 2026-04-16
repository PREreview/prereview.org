import { Context, type Effect } from 'effect'

export class Prereviewers extends Context.Tag('Prereviewers')<
  Prereviewers,
  { register: () => Effect.Effect<void>; isRegistered: () => Effect.Effect<boolean> }
>() {}
