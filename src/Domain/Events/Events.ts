// oxlint-disable module-boundaries/use-index
import { Array, Schema, type Types } from 'effect'
import { EventFilter as GenericEventFilter } from '../../EventSourcing/index.ts'
import * as AuthorInviteEvents from '../AuthorInvites/Events.ts'
import * as CommentEvents from '../Comments/Events.ts'
import * as ContactEmailAddressesEvents from '../ContactEmailAddresses/Events.ts'
import * as DatasetReviewEvents from '../DatasetReviews/Events.ts'
import * as PreprintReviews from '../PreprintReviews/Events.ts'
import * as PrereviewerEvents from '../Prereviewers/Events.ts'
import * as ReviewRequestsEvents from '../ReviewRequests/Events.ts'

export * from '../AuthorInvites/Events.ts'
export * from '../Comments/Events.ts'
export * from '../ContactEmailAddresses/Events.ts'
export * from '../DatasetReviews/Events.ts'
export * from '../PreprintReviews/Events.ts'
export * from '../Prereviewers/Events.ts'
export * from '../ReviewRequests/Events.ts'

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
