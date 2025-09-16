import { ParseResult, pipe, Schema } from 'effect'
import * as Orcid from 'orcid-id-ts'
import * as FptsToEffect from '../FptsToEffect.js'

export { Eq, isOrcid, Orcid, toUrl } from 'orcid-id-ts'

export const OrcidSchema = pipe(Schema.String, Schema.filter(Orcid.isOrcid))

export const OrcidFromUrlSchema = Schema.transformOrFail(Schema.URL, Schema.typeSchema(OrcidSchema), {
  strict: true,
  decode: (url, _, ast) =>
    ParseResult.fromOption(parse(url.href), () => new ParseResult.Type(ast, url, 'Not an ORCID iD')),
  encode: orcid => ParseResult.succeed(Orcid.toUrl(orcid)),
})

export const parse = FptsToEffect.optionK(Orcid.parse)
