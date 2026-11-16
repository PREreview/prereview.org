import { Context } from 'effect'

export class WasPrereviewRemoved extends Context.Service<WasPrereviewRemoved, (id: number) => boolean>()(
  'WasPrereviewRemoved',
) {}
