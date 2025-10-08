import { pipe, Schema } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'

export type ClubId = typeof ClubIdSchema.Type

export const ClubIdSchema = Schema.Literal(
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
  'cibca',
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
  'padua-biomedical-sciences',
  'plant-biotechnology',
  'plant-pathology-genomics',
  'prosac',
  'review-curate-network',
  'reviewing-dental-articles-club',
  'rr-id-student-reviewer-club',
  'sg-biofilms-microbiome',
  'snl-semantics',
  'sun-bioinformatics',
  'surrey-microbiology',
  'tsl-preprint-club',
)

export const ClubIdC = C.fromDecoder(pipe(D.string, D.refine(Schema.is(ClubIdSchema), 'ClubID')))
