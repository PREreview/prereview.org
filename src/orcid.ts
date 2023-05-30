import * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'

export const getNameFromOrcid = (orcid: Orcid) =>
  match(orcid)
    .with('0000-0002-6109-0367' as Orcid, () => TE.of('Daniela Saderi'))
    .otherwise(() => TE.left('not-found' as const))
