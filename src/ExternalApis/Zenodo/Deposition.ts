import { Array, Effect, Schema } from 'effect'
import { HtmlSchema, PlainTextSchema } from '../../html.ts'
import { Doi, OrcidId } from '../../types/index.ts'

export type DepositMetadata = typeof DepositMetadata.Type

export type UnsubmittedDeposition = typeof UnsubmittedDeposition.Type

export type SubmittedDeposition = typeof SubmittedDeposition.Type

const RelatedIdentifiers = Schema.Tuple([
  Schema.Struct({
    identifier: Doi.DoiSchema,
    relation: Schema.Literal('reviews'),
    resourceType: Schema.Literal('dataset'),
    scheme: Schema.Literal('doi'),
  }).pipe(Schema.encodeKeys({ resourceType: 'resource_type' })),
  Schema.Struct({
    identifier: Schema.URLFromString,
    relation: Schema.Literal('isIdenticalTo'),
    resourceType: Schema.Literal('publication-peerreview'),
    scheme: Schema.Literal('url'),
  }).pipe(Schema.encodeKeys({ resourceType: 'resource_type' })),
])

const DepositMetadataFields = {
  creators: Schema.NonEmptyArray(Schema.Struct({ name: Schema.String, orcid: Schema.optional(OrcidId.OrcidIdSchema) })),
  description: HtmlSchema,
  title: PlainTextSchema,
  communities: Schema.Array(Schema.Struct({ identifier: Schema.Literal('prereview-reviews') })).pipe(
    Schema.withDecodingDefaultType(Effect.sync(Array.empty)),
  ),
  license: Schema.Literals(['cc-by-4.0', 'cc-zero']),
  relatedIdentifiers: RelatedIdentifiers,
  uploadType: Schema.Literal('publication'),
  publicationType: Schema.Literal('peerreview'),
}

const DepositMetadataKeys = {
  relatedIdentifiers: 'related_identifiers',
  uploadType: 'upload_type',
  publicationType: 'publication_type',
} as const

export const DepositMetadata = Schema.Struct(DepositMetadataFields).pipe(Schema.encodeKeys(DepositMetadataKeys))

export const UnsubmittedDeposition = Schema.Struct({
  id: Schema.Int,
  links: Schema.Struct({
    bucket: Schema.URLFromString,
    publish: Schema.URLFromString,
  }),
  metadata: Schema.Struct({
    ...DepositMetadataFields,
    prereserveDoi: Schema.Struct({ doi: Doi.DoiSchema }),
  }).pipe(Schema.encodeKeys({ ...DepositMetadataKeys, prereserveDoi: 'prereserve_doi' })),
  state: Schema.Literal('unsubmitted'),
  submitted: Schema.Literal(false),
})

export const SubmittedDeposition = Schema.Struct({
  id: Schema.Int,
  metadata: Schema.Struct({
    ...DepositMetadataFields,
    doi: Doi.DoiSchema,
  }).pipe(Schema.encodeKeys(DepositMetadataKeys)),
  state: Schema.Literal('done'),
  submitted: Schema.Literal(true),
})
