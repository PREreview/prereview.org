import { Array, Either, flow } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { Uuid } from '../types/Uuid.ts'

export type Input = Uuid

export type Result = boolean

const createFilter = (invitationId: Input) =>
  Events.EventFilter({
    types: ['EmailToInviteAuthorSent'],
    predicates: { invitationId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  return Array.some(events, Events.matches(filter))
}

export const HasAnEmailToInviteAuthorBeenSent = Queries.OnDemandQuery({
  name: 'AuthorInvites.hasAnEmailToInviteAuthorBeenSent',
  createFilter,
  query: flow(query, Either.right),
})
