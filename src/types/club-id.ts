import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'

export type ClubId =
  | 'asapbio-cancer-biology'
  | 'asapbio-meta-research'
  | 'asapbio-metabolism'
  | 'asapbio-neurobiology'
  | 'biomass-biocatalysis'
  | 'biophysics-leipzig'
  | 'cara'
  | 'hhmi-training-pilot'
  | 'language-club'
  | 'open-science-community-iraqi'
  | 'rr-id-student-reviewer-club'
  | 'tsl-preprint-club'

export const ClubIdC = C.fromDecoder(pipe(D.string, D.refine(isClubId, 'ClubID')))

export function isClubId(value: string): value is ClubId {
  return [
    'asapbio-cancer-biology',
    'asapbio-meta-research',
    'asapbio-metabolism',
    'asapbio-neurobiology',
    'biomass-biocatalysis',
    'biophysics-leipzig',
    'cara',
    'hhmi-training-pilot',
    'language-club',
    'open-science-community-iraqi',
    'rr-id-student-reviewer-club',
    'tsl-preprint-club',
  ].includes(value)
}
