import { Context } from 'effect'
import type * as Commands from '../Commands.ts'
import type { AcceptInvite } from './AcceptInvite.ts'

export class AuthorInvites extends Context.Tag('AuthorInvites')<
  AuthorInvites,
  {
    acceptInvite: Commands.FromCommand<typeof AcceptInvite>
  }
>() {}
