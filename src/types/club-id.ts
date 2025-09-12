import { pipe } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'

export const clubIds = [
  'asapbio-cancer-biology',
  'asapbio-cell-biology',
  'asapbio-immunology',
  'asapbio-meta-research',
  'asapbio-metabolism',
  'asapbio-microbiology',
  'asapbio-neurobiology',
  'bimsb-neuroscience',
  'biobio',
  'biomass-biocatalysis',
  'biopeers-slu',
  'biophysics-leipzig',
  'bios2',
  'bloomington-biology',
  'cara',
  'elife-ambassadors',
  'emerge',
  'etymos-analytica',
  'force11',
  'hhmi-training-pilot',
  'iib-mar-del-plata',
  'intersectional-feminist',
  'jmir-publications',
  'language-club',
  'marine-invertebrates',
  'neuroden',
  'nsa-utd',
  'open-box-science',
  'open-science-community-iraqi',
  'open-science-community-uruguay',
  'oxplants',
  'plant-biotechnology',
  'prosac',
  'review-curate-network',
  'reviewing-dental-articles-club',
  'rr-id-student-reviewer-club',
  'sg-biofilms-microbiome',
  'snl-semantics',
  'sun-bioinformatics',
  'surrey-microbiology',
  'tsl-preprint-club',
] as const

export type ClubId = (typeof clubIds)[number]

export const ClubIdC = C.fromDecoder(pipe(D.string, D.refine(isClubId, 'ClubID')))

export function isClubId(value: string): value is ClubId {
  return (clubIds as ReadonlyArray<string>).includes(value)
}
