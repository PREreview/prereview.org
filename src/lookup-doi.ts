import { isDoi } from 'doi-ts'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'

const DoiD = D.fromRefinement(isDoi, 'DOI')

const LookupDoiD = pipe(
  D.struct({
    doi: DoiD,
  }),
  D.map(get('doi')),
)

export const lookupDoi = pipe(
  M.decodeBody(LookupDoiD.decode),
  M.ichainFirst(() => M.status(Status.SeeOther)),
  M.ichain(doi => M.header('Location', `/preprints/doi-${doi.replace('/', '-')}`)),
  M.ichain(() => M.closeHeaders()),
  M.ichain(() => M.end()),
  M.orElse(() =>
    pipe(
      M.status(Status.SeeOther),
      M.ichain(() => M.header('Location', '/')),
      M.ichain(() => M.closeHeaders()),
      M.ichain(() => M.end()),
    ),
  ),
)
