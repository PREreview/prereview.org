import { Array, Result, flow } from 'effect'
import { Queries } from '../../EventSourcing/index.ts'
import type { OrcidId } from '../../types/index.ts'
import * as Events from '../Events/index.ts'

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
  query: flow(query, Result.succeed),
})
