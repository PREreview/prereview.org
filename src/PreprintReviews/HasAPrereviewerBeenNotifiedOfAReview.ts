import { Array, Either, flow } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly prereviewId: number
}

export type Result = boolean

const createFilter = ({ orcidId, prereviewId }: Input) =>
  Events.EventFilter({
    types: ['EmailToNotifyPrereviewerOfAPrereviewWasSent'],
    predicates: { orcidId, prereviewId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  return Array.some(events, Events.matches(filter))
}

export const HasAPrereviewerBeenNotifiedOfAReview = Queries.OnDemandQuery({
  name: 'PreprintReviews.hasAPrereviewerBeenNotifiedOfAReview',
  createFilter,
  query: flow(query, Either.right),
})
