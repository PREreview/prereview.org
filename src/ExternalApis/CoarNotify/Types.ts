import { Schema } from 'effect'
import { Doi, Name } from '../../types/index.ts'

export type RequestReview = Schema.Schema.Type<typeof RequestReviewSchema>

export const RequestReviewSchema = Schema.Struct({
  '@context': Schema.TupleWithRest(
    Schema.Tuple([
      Schema.Literal('https://www.w3.org/ns/activitystreams'),
      Schema.Literals(['https://coar-notify.net', 'https://purl.org/coar/notify']),
    ]),
    [Schema.String],
  ),
  id: Schema.String,
  type: Schema.Tuple([Schema.Literal('Offer'), Schema.Literal('coar-notify:ReviewAction')]),
  origin: Schema.Struct({
    id: Schema.URLFromString,
    inbox: Schema.optionalKey(Schema.URLFromString),
    type: Schema.Literals(['Organization', 'Service']),
  }),
  target: Schema.Struct({
    id: Schema.URLFromString,
    inbox: Schema.URLFromString,
    type: Schema.Literals(['Organization', 'Service']),
  }),
  object: Schema.Struct({
    id: Schema.String,
    'ietf:cite-as': Doi.DoiFromUrlSchema,
  }),
  actor: Schema.Struct({
    id: Schema.URLFromString,
    type: Schema.Literals(['Application', 'Group', 'Organization', 'Person', 'Service']),
    name: Name.NameSchema,
  }),
})

export type AnnounceReview = Schema.Schema.Type<typeof AnnounceReviewSchema>

export const AnnounceReviewSchema = Schema.Struct({
  '@context': Schema.Tuple([
    Schema.Literal('https://www.w3.org/ns/activitystreams'),
    Schema.Literals(['https://coar-notify.net', 'https://purl.org/coar/notify']),
  ]),
  id: Schema.URLFromString,
  type: Schema.Tuple([Schema.Literal('Announce'), Schema.Literal('coar-notify:ReviewAction')]),
  origin: Schema.Struct({
    id: Schema.URLFromString,
    inbox: Schema.optionalKey(Schema.URLFromString),
    type: Schema.Literals(['Organization', 'Service']),
  }),
  target: Schema.Struct({
    id: Schema.URLFromString,
    inbox: Schema.URLFromString,
    type: Schema.Literals(['Organization', 'Service']),
  }),
  context: Schema.Struct({
    id: Schema.URLFromString,
    'ietf:cite-as': Schema.Union([Doi.DoiFromUrlSchema, Schema.URLFromString]),
  }),
  object: Schema.Struct({
    id: Schema.URLFromString,
    'ietf:cite-as': Doi.DoiFromUrlSchema,
    type: Schema.Tuple([Schema.Literal('Page'), Schema.Literal('sorg:Review')]),
  }),
})

export type Message = typeof MessageSchema.Type

export const MessageSchema = Schema.Union([RequestReviewSchema, AnnounceReviewSchema])
