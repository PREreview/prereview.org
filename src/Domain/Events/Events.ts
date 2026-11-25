import { Array, Schema, type Types } from 'effect'
import { EventFilter as GenericEventFilter } from '../../EventSourcing/index.ts'
import * as AuthorInviteEvents from './AuthorInvites.ts'
import * as CommentEvents from './Comments.ts'
import * as ContactEmailAddressesEvents from './ContactEmailAddresses.ts'
import * as DatasetReviewEvents from './DatasetReviews.ts'
import * as PreprintReviews from './PreprintReviews.ts'
import * as PrereviewerEvents from './Prereviewers.ts'
import * as ReviewRequestsEvents from './ReviewRequests.ts'

export * from './AuthorInvites.ts'
export * from './Comments.ts'
export * from './ContactEmailAddresses.ts'
export * from './DatasetReviews.ts'
export * from './PreprintReviews.ts'
export * from './Prereviewers.ts'
export * from './ReviewRequests.ts'

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

export type EventFilter = GenericEventFilter.EventFilter<Event>

export const EventFilter = GenericEventFilter.make<Event>()

export const matches = GenericEventFilter.matches(Event)

export const EventTypes = Array.map(Event.members, member => member.identifier as Event['_tag'])

const CommentEventTypes = Array.map(
  CommentEvents.CommentEvent.members,
  member => member.identifier as CommentEvents.CommentEvent['_tag'],
)

export const isCommentEvent: (event: Event) => event is CommentEvents.CommentEvent = isA(...CommentEventTypes)

export type EventsForFilter<F extends EventFilter> = GenericEventFilter.EventsForFilter<Event, F>

export type EventSubset<SubsetTags extends Types.Tags<Event> | ReadonlyArray<Types.Tags<Event>>> =
  GenericEventFilter.EventSubset<Event, SubsetTags>

function isA<Tag extends Types.Tags<Event>>(...tags: ReadonlyArray<Tag>) {
  return (event: Event): event is EventSubset<Tag> => Array.contains(tags, event._tag)
}
