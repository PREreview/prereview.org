import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { isOrcid } from 'orcid-id-ts'

export type User = C.TypeOf<typeof UserC>

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

export const UserC = pipe(
  C.struct({
    name: C.string,
    orcid: OrcidC,
  }),
  C.intersect(
    C.partial({
      pseudonym: C.string,
    }),
  ),
)
