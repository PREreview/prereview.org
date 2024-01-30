import type { Ord } from 'fp-ts/Ord'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RS from 'fp-ts/ReadonlySet'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import type { Orcid } from 'orcid-id-ts'
import { type NonEmptyString, NonEmptyStringC, ordNonEmptyString } from './types/string'

export interface OrcidToken {
  readonly accessToken: NonEmptyString
  readonly scopes: ReadonlySet<NonEmptyString>
}

export interface EditOrcidTokenEnv {
  saveOrcidToken: (orcid: Orcid, orcidToken: OrcidToken) => TE.TaskEither<'unavailable', void>
}

const ReadonlySetC = <O, A>(item: C.Codec<unknown, O, A>, ordItem: Ord<A>) =>
  pipe(C.array(item), C.readonly, C.imap(RS.fromReadonlyArray(ordItem), RS.toReadonlyArray(ordItem)))

export const OrcidTokenC = C.struct({
  accessToken: NonEmptyStringC,
  scopes: ReadonlySetC(NonEmptyStringC, ordNonEmptyString),
}) satisfies C.Codec<unknown, unknown, OrcidToken>

export const saveOrcidToken = (
  orcid: Orcid,
  orcidToken: OrcidToken,
): RTE.ReaderTaskEither<EditOrcidTokenEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveOrcidToken }) => saveOrcidToken(orcid, orcidToken)))
