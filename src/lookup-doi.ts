import { isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { pipe } from 'fp-ts/function'
import * as M from 'hyper-ts/lib/Middleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { seeOther } from './middleware'
import { homeMatch } from './routes'

const DoiD = D.fromRefinement(isDoi, 'DOI')

const LookupDoiD = pipe(
  D.struct({
    doi: DoiD,
  }),
  D.map(get('doi')),
)

export const lookupDoi = pipe(
  M.decodeBody(LookupDoiD.decode),
  M.ichain(doi => seeOther(`/preprints/doi-${doi.replace('/', '-')}`)),
  M.orElse(() => seeOther(format(homeMatch.formatter, {}))),
)
