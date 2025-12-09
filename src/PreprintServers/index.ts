import { Match, Record } from 'effect'
import type { CoarNotify } from '../ExternalApis/index.ts'
import type { PreprintId } from '../Preprints/index.ts'

export const getName = Match.typeTags<PreprintId, string>()({
  AdvancePreprintId: () => 'Advance',
  AfricarxivFigsharePreprintId: () => 'AfricArXiv Preprints',
  AfricarxivOsfPreprintId: () => 'AfricArXiv Preprints',
  AfricarxivUbuntunetPreprintId: () => 'AfricArXiv Preprints',
  AfricarxivZenodoPreprintId: () => 'AfricArXiv Preprints',
  ArcadiaSciencePreprintId: () => 'Arcadia Science',
  ArxivPreprintId: () => 'arXiv',
  AuthoreaPreprintId: () => 'Authorea',
  BiorxivPreprintId: () => 'bioRxiv',
  ChemrxivPreprintId: () => 'ChemRxiv',
  CurvenotePreprintId: () => 'Curvenote',
  EartharxivPreprintId: () => 'EarthArXiv',
  EcoevorxivPreprintId: () => 'EcoEvoRxiv',
  EdarxivPreprintId: () => 'EdArXiv',
  EngrxivPreprintId: () => 'engrXiv',
  JxivPreprintId: () => 'Jxiv',
  LifecycleJournalPreprintId: () => 'Lifecycle Journal',
  MedrxivPreprintId: () => 'medRxiv',
  MetaarxivPreprintId: () => 'MetaArXiv',
  NeurolibrePreprintId: () => 'NeuroLibre',
  OsfPreprintId: () => 'OSF',
  OsfPreprintsPreprintId: () => 'OSF Preprints',
  PhilsciPreprintId: () => 'PhilSci-Archive',
  PreprintsorgPreprintId: () => 'Preprints.org',
  PsyarxivPreprintId: () => 'PsyArXiv',
  PsychArchivesPreprintId: () => 'PsychArchives',
  ResearchSquarePreprintId: () => 'Research Square',
  ScieloPreprintId: () => 'SciELO Preprints',
  ScienceOpenPreprintId: () => 'ScienceOpen Preprints',
  SocarxivPreprintId: () => 'SocArXiv',
  SsrnPreprintId: () => 'SSRN',
  TechrxivPreprintId: () => 'TechRxiv',
  VerixivPreprintId: () => 'VeriXiv',
  ZenodoPreprintId: () => 'Zenodo',
})

export const getCoarNotifyTarget = (preprintId: PreprintId) => Record.get(coarNotifyTargets, preprintId._tag as never)

const coarNotifyTargets = {
  PreprintsorgPreprintId: {
    id: new URL('https://www.preprints.org/'),
    inbox: new URL('https://www.preprints.org/inbox'),
    type: 'Service',
  },
} satisfies Partial<Record<PreprintId['_tag'], CoarNotify.Message['target']>>

export type CoarNotifyTargetPreprintId = Extract<PreprintId, { _tag: keyof typeof coarNotifyTargets }>
