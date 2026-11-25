import { Array, Schema, type Types } from 'effect'
// oxlint-disable  module-boundaries/use-index
import * as AuthorInviteEvents from './Domain/AuthorInvites/Events.ts'
import * as CommentEvents from './Domain/Comments/Events.ts'
import * as ContactEmailAddressesEvents from './Domain/ContactEmailAddresses/Events.ts'
import * as DatasetReviewEvents from './Domain/DatasetReviews/Events.ts'
import * as PreprintReviews from './Domain/PreprintReviews/Events.ts'
import * as PrereviewerEvents from './Domain/Prereviewers/Events.ts'
import * as ReviewRequestsEvents from './Domain/ReviewRequests/Events.ts'
import * as EventFilters from './EventSourcing/EventFilter.ts'

export * from './Domain/AuthorInvites/Events.ts'
export * from './Domain/Comments/Events.ts'
export * from './Domain/ContactEmailAddresses/Events.ts'
export * from './Domain/DatasetReviews/Events.ts'
export * from './Domain/PreprintReviews/Events.ts'
export * from './Domain/Prereviewers/Events.ts'
export * from './Domain/ReviewRequests/Events.ts'

export type Event = typeof Event.Type

export const Event = Schema.Union([
  ...AuthorInviteEvents.AuthorInviteEvent.members,
  ...CommentEvents.CommentEvent.members,
  ContactEmailAddressesEvents.ContactAddressImported,
  ContactEmailAddressesEvents.ContactAddressVerified,
  ContactEmailAddressesEvents.ContactAddressRecorded,
  ContactEmailAddressesEvents.EmailToVerifyContactAddressSent,
  ContactEmailAddressesEvents.AuthorInviteEmailAddressChosenAsContactAddress,
  ...DatasetReviewEvents.DatasetReviewEvent.members,
  ...ReviewRequestsEvents.ReviewRequestEvent.members,
  PreprintReviews.RapidPrereviewImported,
  PreprintReviews.PreprintReviewImported,
  PreprintReviews.PreprintReviewWasAddedToAClub,
  PreprintReviews.EmailToNotifyPrereviewerOfAPrereviewWasSent,
  ...PrereviewerEvents.PrereviewerEvent.members,
])

export type EventFilter = EventFilters.EventFilter<Event>

export const EventFilter = EventFilters.make<Event>()

export const matches = EventFilters.matches(Event)

export const EventTypes = Array.map(Event.members, member => member.identifier as Event['_tag'])

const CommentEventTypes = Array.map(
  CommentEvents.CommentEvent.members,
  member => member.identifier as CommentEvents.CommentEvent['_tag'],
)

export const isCommentEvent: (event: Event) => event is CommentEvents.CommentEvent = isA(...CommentEventTypes)

export type EventsForFilter<F extends EventFilter> = EventFilters.EventsForFilter<Event, F>

export type EventSubset<SubsetTags extends Types.Tags<Event> | ReadonlyArray<Types.Tags<Event>>> =
  EventFilters.EventSubset<Event, SubsetTags>

function isA<Tag extends Types.Tags<Event>>(...tags: ReadonlyArray<Tag>) {
  return (event: Event): event is EventSubset<Tag> => Array.contains(tags, event._tag)
}
