import * as T from 'fp-ts/Task'
import * as C from 'io-ts/Codec'

export type User = C.TypeOf<typeof UserC>

export const UserC = C.struct({
  name: C.string,
  orcid: C.string,
  pseudonym: C.string,
})

export const getPseudonym: (orcid: string) => T.Task<string> = () => T.of('PREreviewer')
