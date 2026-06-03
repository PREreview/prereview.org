import { Array, Either, flow, Option } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { Uuid } from '../../types/index.ts'

export type Input = Uuid.Uuid

export type Result = boolean

const createFilter = (datasetReviewId: Input) =>
  Events.EventFilter([
    {
      types: ['AnsweredIfOthersNeedToBeListedOnTheReview'],
      predicates: { datasetReviewId },
    },
  ])

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  return Option.match(Array.last(filteredEvents), {
    onNone: () => false,
    onSome: ({ answer }) => answer === 'yes',
  })
}

export const AreThereMultipleAuthorsOnAReview = Queries.OnDemandQuery({
  name: 'DatasetReviews.areThereMultipleAuthorsOnAReview',
  createFilter,
  query: flow(query, Either.right),
})
