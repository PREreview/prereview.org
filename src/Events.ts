import { Array, Schema, Struct } from 'effect'
import * as CommentEvents from './Comments/Events.js' // eslint-disable-line import/no-internal-modules
import * as DatasetReviewEvents from './DatasetReviews/Events.js' // eslint-disable-line import/no-internal-modules

export * from './Comments/Events.js' // eslint-disable-line import/no-internal-modules
export * from './DatasetReviews/Events.js' // eslint-disable-line import/no-internal-modules

export type Event = typeof Event.Type

export const Event = Schema.Union(
  ...CommentEvents.CommentEvent.members,
  ...DatasetReviewEvents.DatasetReviewEvent.members,
)

export const EventTypes = Array.map(Event.members, Struct.get('_tag'))
