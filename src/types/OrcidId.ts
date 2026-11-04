import { type Equivalence, type Option, pipe, type Predicate, Schema, SchemaIssue, SchemaGetter, Effect } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as OrcidIdTs from 'orcid-id-ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { NonEmptyString } from './NonEmptyString.ts'

export type OrcidId = OrcidIdTs.Orcid & NonEmptyString

export const isOrcidId: Predicate.Refinement<unknown, OrcidId> = OrcidIdTs.isOrcid as never

export const OrcidIdSchema = pipe(Schema.String, Schema.refine(isOrcidId))

export const OrcidId: (orcidId: string) => OrcidId = orcidId => OrcidIdSchema.make(orcidId)

export const OrcidIdFromUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(Schema.toType(OrcidIdSchema), {
    decode: SchemaGetter.transformEffect(url =>
      Effect.fromOption(parse(url.href), () => new SchemaIssue.InvalidValue({ message: 'Not an ORCID iD' }, url)),
    ),
    encode: SchemaGetter.transformEffect(orcidId => Effect.succeed(OrcidIdTs.toUrl(orcidId))),
  }),
)

export const parse: (string: string) => Option.Option<OrcidId> = FptsToEffect.optionK(OrcidIdTs.parse as never)

export const toUrl: (orcid: OrcidId) => URL = OrcidIdTs.toUrl

export const OrcidIdEquivalence: Equivalence.Equivalence<OrcidId> = OrcidIdTs.Eq.equals

export const OrcidC = C.fromDecoder(D.fromRefinement(isOrcidId, 'ORCID'))
