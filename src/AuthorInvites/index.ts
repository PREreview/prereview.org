import { Context, Effect, Layer } from 'effect'
import * as Commands from '../Commands.ts'
import { AcceptInvite } from './AcceptInvite.ts'
import type { ChoosePersona } from './ChoosePersona.ts'

export class AuthorInvites extends Context.Tag('AuthorInvites')<
  AuthorInvites,
  {
    acceptInvite: Commands.FromCommand<typeof AcceptInvite>
    choosePersona: Commands.FromCommand<typeof ChoosePersona>
  }
>() {}

export const layer = Layer.effect(
  AuthorInvites,
  Effect.gen(function* () {
    return {
      acceptInvite: yield* Commands.makeCommand(AcceptInvite),
      choosePersona: () => new Commands.UnableToHandleCommand({ cause: 'not implemented' }),
    }
  }),
)
