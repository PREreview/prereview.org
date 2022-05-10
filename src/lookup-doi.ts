import { Doi } from 'doi-ts'
import { flow } from 'fp-ts/function'
import * as M from 'hyper-ts/lib/Middleware'

export const lookupDoi = flow(
  (doi: Doi) => M.redirect(`/preprints/doi-${doi.replace('/', '-')}`),
  M.ichain(() => M.closeHeaders()),
  M.ichain(() => M.end()),
)
