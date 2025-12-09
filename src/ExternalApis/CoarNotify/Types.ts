import { Schema } from 'effect'
import { Doi, NonEmptyString } from '../../types/index.ts'

export type RequestReview = Schema.Schema.Type<typeof RequestReviewSchema>

export const RequestReviewSchema = Schema.Struct({
  '@context': Schema.Tuple(
    [
      Schema.Literal('https://www.w3.org/ns/activitystreams'),
      Schema.Literal('https://coar-notify.net', 'https://purl.org/coar/notify'),
    ],
    Schema.String,
  ),
  id: Schema.String,
  type: Schema.Tuple(Schema.Literal('Offer'), Schema.Literal('coar-notify:ReviewAction')),
  origin: Schema.Struct({
    id: Schema.URL,
    inbox: Schema.optionalWith(Schema.URL, { exact: true }),
    type: Schema.Literal('Organization', 'Service'),
  }),
  target: Schema.Struct({
    id: Schema.URL,
    inbox: Schema.URL,
    type: Schema.Literal('Organization', 'Service'),
  }),
  object: Schema.Struct({
    id: Schema.String,
    'ietf:cite-as': Doi.DoiFromUrlSchema,
  }),
  actor: Schema.Struct({
    id: Schema.URL,
    type: Schema.Literal('Application', 'Group', 'Organization', 'Person', 'Service'),
    name: Schema.compose(Schema.Trim, NonEmptyString.NonEmptyStringSchema),
  }),
})

export type AnnounceReview = Schema.Schema.Type<typeof AnnounceReviewSchema>

export const AnnounceReviewSchema = Schema.Struct({
  '@context': Schema.Tuple(
    Schema.Literal('https://www.w3.org/ns/activitystreams'),
    Schema.Literal('https://coar-notify.net', 'https://purl.org/coar/notify'),
  ),
  id: Schema.URL,
  type: Schema.Tuple(Schema.Literal('Announce'), Schema.Literal('coar-notify:ReviewAction')),
  origin: Schema.Struct({
    id: Schema.URL,
    inbox: Schema.optionalWith(Schema.URL, { exact: true }),
    type: Schema.Literal('Organization', 'Service'),
  }),
  target: Schema.Struct({
    id: Schema.URL,
    inbox: Schema.URL,
    type: Schema.Literal('Organization', 'Service'),
  }),
  context: Schema.Struct({
    id: Schema.URL,
    'ietf:cite-as': Doi.DoiFromUrlSchema,
  }),
  object: Schema.Struct({
    id: Schema.URL,
    'ietf:cite-as': Doi.DoiFromUrlSchema,
    type: Schema.Tuple(Schema.Literal('Page'), Schema.Literal('sorg:Review')),
  }),
})

export type Message = typeof MessageSchema.Type

export const MessageSchema = Schema.Union(RequestReviewSchema, AnnounceReviewSchema)
