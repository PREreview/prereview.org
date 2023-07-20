import type { Doi } from 'doi-ts'
import { toUrl } from 'doi-ts'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { v4 as uuidv4 } from 'uuid'
import type { PreprintId } from './preprint-id'

const BASE_URL = 'https://sandbox.prereview.org'
const REVIEWS_URL = `${BASE_URL}/reviews`
const _STUBBED_INBOX_URL = 'http://notify-inbox.info/inbox'

const NOTIFY_STATIC_CONTEXT = ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify']
const REVIEW_ACTION_TYPE = 'sorg:Review'
const SERVICE_TYPE = 'Service'

export type NotifyType = Array<string> | string

export const AnnouceReviewType: NotifyType = ['Announce', 'coar-notify:ReviewAction']

const SERVICE: NotifyActor = {
  id: new URL(BASE_URL),
  name: 'PREreview',
  type: SERVICE_TYPE,
}

const SERVICE_INBOX: NotifyInbox = {
  id: new URL(BASE_URL),
  inbox: new URL(`${BASE_URL}/inbox`),
  type: SERVICE_TYPE,
}

export type NotifyActor = {
  id: URL
  name: string
  type: NotifyType
}

export type NotifyInbox = {
  id: URL
  inbox: URL
  type: NotifyType
}

export type NotifyObject = {
  id: URL
  'ietf:cite-as': Doi
  type: NotifyType
}

export type NotifyContext = {
  id: URL
}

export type Notification = {
  '@context': Array<string> | string
  id: string
  actor: NotifyActor
  origin: NotifyInbox
  type: NotifyType
  object: NotifyObject
  target: NotifyInbox
  context: NotifyContext
}

type Review = {
  id: number
  doi: Doi
  preprintId: PreprintId
}

export const publishedReviewToNotifyObject = (review: Review): NotifyObject => ({
  id: new URL(`${REVIEWS_URL}/${review.id}`),
  'ietf:cite-as': review.doi,
  type: ['Document', REVIEW_ACTION_TYPE],
})

export const preprintToNotifyContext = (preprintId: PreprintId): NotifyContext => ({
  id: preprintId.type === 'philsci' ? new URL('') : toUrl(preprintId.value),
})

const TARGET: NotifyInbox = {
  id: new URL('https://bioxriv.org'),
  inbox: new URL(_STUBBED_INBOX_URL),
  type: SERVICE_TYPE,
}

function generateNotificationId(): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
  return `urn:uuid:${uuidv4()}`
}

function composeNotification(review: Review): Notification {
  return {
    '@context': NOTIFY_STATIC_CONTEXT,
    id: generateNotificationId(),
    actor: SERVICE,
    origin: SERVICE_INBOX,
    type: AnnouceReviewType,
    object: publishedReviewToNotifyObject(review),
    target: TARGET,
    context: preprintToNotifyContext(review.preprintId),
  }
}

function sendNotification(notification: Notification): TE.TaskEither<Error, Response> {
  return TE.tryCatch(
    () =>
      fetch(notification.target.inbox, {
        method: 'POST',
        body: JSON.stringify(notification),
        headers: { 'Content-Type': 'application/ld+json' },
      }),
    reason => new Error(String(reason)),
  )
}

export const notificationHandler = (review: Review): TE.TaskEither<Error, Response> =>
  pipe(composeNotification(review), sendNotification)
