import { type Equivalence, ParseResult, pipe, Schema } from 'effect'
import * as OrcidId from 'orcid-id-ts'
import * as FptsToEffect from '../FptsToEffect.ts'

export { isOrcid as isOrcidId, Orcid as OrcidId, toUrl } from 'orcid-id-ts'

export const OrcidIdSchema = pipe(Schema.String, Schema.filter(OrcidId.isOrcid))

export const OrcidIdFromUrlSchema = Schema.transformOrFail(Schema.URL, Schema.typeSchema(OrcidIdSchema), {
  strict: true,
  decode: (url, _, ast) =>
    ParseResult.fromOption(parse(url.href), () => new ParseResult.Type(ast, url, 'Not an ORCID iD')),
  encode: orcidId => ParseResult.succeed(OrcidId.toUrl(orcidId)),
})

export const parse = FptsToEffect.optionK(OrcidId.parse)

export const OrcidIdEquivalence: Equivalence.Equivalence<OrcidId.Orcid> = FptsToEffect.eq(OrcidId.Eq)
