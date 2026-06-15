import { Array, Record, type Types } from 'effect'
import type { CoarNotify } from '../ExternalApis/index.ts'
import type { PreprintId } from '../Preprints/index.ts'
import { NonEmptyString } from '../types/NonEmptyString.ts'

const serverNames: Record<PreprintId['_tag'], NonEmptyString> = Record.map(
  {
    AdvancePreprintId: 'Advance',
    AfricarxivFigsharePreprintId: 'AfricArXiv Preprints',
    AfricarxivOsfPreprintId: 'AfricArXiv Preprints',
    AfricarxivUbuntunetPreprintId: 'AfricArXiv Preprints',
    AfricarxivZenodoPreprintId: 'AfricArXiv Preprints',
    ArcadiaSciencePreprintId: 'Arcadia Science',
    ArxivPreprintId: 'arXiv',
    AuthoreaPreprintId: 'Authorea',
    BiorxivPreprintId: 'bioRxiv',
    ChemrxivPreprintId: 'ChemRxiv',
    CurvenotePreprintId: 'Curvenote',
    EartharxivPreprintId: 'EarthArXiv',
    EcoevorxivPreprintId: 'EcoEvoRxiv',
    EdarxivPreprintId: 'EdArXiv',
    EngrxivPreprintId: 'engrXiv',
    JmirPreprintId: 'JMIR Preprints',
    JxivPreprintId: 'Jxiv',
    LifecycleJournalPreprintId: 'Lifecycle Journal',
    MedrxivPreprintId: 'medRxiv',
    MetaarxivPreprintId: 'MetaArXiv',
    NeurolibrePreprintId: 'NeuroLibre',
    OsfPreprintId: 'OSF',
    OsfPreprintsPreprintId: 'OSF Preprints',
    PhilsciPreprintId: 'PhilSci-Archive',
    PreprintsorgPreprintId: 'Preprints.org',
    PsyarxivPreprintId: 'PsyArXiv',
    PsychArchivesPreprintId: 'PsychArchives',
    ResearchSquarePreprintId: 'Research Square',
    ScieloPreprintId: 'SciELO Preprints',
    ScienceOpenPreprintId: 'ScienceOpen Preprints',
    SocarxivPreprintId: 'SocArXiv',
    SsrnPreprintId: 'SSRN',
    TechrxivPreprintId: 'TechRxiv',
    UmsidaPreprintId: 'UMSIDA Preprints',
    VerixivPreprintId: 'VeriXiv',
    ZenodoPreprintId: 'Zenodo',
  },
  NonEmptyString,
)

export const getServerName = (preprintId: PreprintId): NonEmptyString => serverNames[preprintId._tag]

export const ServerNames: Array.NonEmptyReadonlyArray<NonEmptyString> = Array.dedupe(
  Record.values(serverNames),
) as never

export const getCoarNotifyTarget = (preprintId: PreprintId) => Record.get(coarNotifyTargets, preprintId._tag as never)

const coarNotifyTargets = {
  PreprintsorgPreprintId: {
    id: new URL('https://www.preprints.org/'),
    inbox: new URL('https://www.preprints.org/inbox'),
    type: 'Service',
  },
} satisfies Partial<Record<Types.Tags<PreprintId>, CoarNotify.Message['target']>>

export type CoarNotifyTargetPreprintId = Types.ExtractTag<PreprintId, keyof typeof coarNotifyTargets>
