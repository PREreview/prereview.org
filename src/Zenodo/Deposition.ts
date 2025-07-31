import { Schema } from 'effect'
import { Html, rawHtml } from '../html.js'
import { Doi } from '../types/index.js'

export type DepositMetadata = typeof DepositMetadata.Type

export type UnsubmittedDeposition = typeof UnsubmittedDeposition.Type

export type SubmittedDeposition = typeof SubmittedDeposition.Type

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: rawHtml,
  encode: String,
})

export const DepositMetadata = Schema.Struct({
  creators: Schema.Tuple(Schema.Struct({ name: Schema.String })),
  description: HtmlSchema,
  title: Schema.String,
  communities: Schema.Tuple(Schema.Struct({ identifier: Schema.Literal('prereview-reviews') })),
  relatedIdentifiers: Schema.propertySignature(
    Schema.Tuple(
      Schema.Struct({
        identifier: Doi.DoiSchema,
        relation: Schema.Literal('reviews'),
        resourceType: Schema.propertySignature(Schema.Literal('dataset')).pipe(Schema.fromKey('resource_type')),
        scheme: Schema.Literal('doi'),
      }),
    ),
  ).pipe(Schema.fromKey('related_identifiers')),
  uploadType: Schema.propertySignature(Schema.Literal('publication')).pipe(Schema.fromKey('upload_type')),
  publicationType: Schema.propertySignature(Schema.Literal('peerreview')).pipe(Schema.fromKey('publication_type')),
})

export const UnsubmittedDeposition = Schema.Struct({
  id: Schema.Int,
  links: Schema.Struct({
    bucket: Schema.URL,
    publish: Schema.URL,
  }),
  metadata: Schema.Struct({
    ...DepositMetadata.fields,
    prereserveDoi: Schema.propertySignature(Schema.Struct({ doi: Doi.DoiSchema })).pipe(
      Schema.fromKey('prereserve_doi'),
    ),
  }),
  state: Schema.Literal('unsubmitted'),
  submitted: Schema.Literal(false),
})

export const SubmittedDeposition = Schema.Struct({
  id: Schema.Int,
  metadata: Schema.Struct({
    ...DepositMetadata.fields,
    doi: Doi.DoiSchema,
  }),
  state: Schema.Literal('done'),
  submitted: Schema.Literal(true),
})
