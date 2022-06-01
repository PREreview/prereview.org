import * as C from 'io-ts/Codec'

export type User = C.TypeOf<typeof UserC>

export const UserC = C.struct({
  name: C.string,
  orcid: C.string,
  pseudonym: C.string,
})
