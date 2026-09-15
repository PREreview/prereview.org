import { Array, Record } from 'effect'
import * as Preprints from '../../Preprints/index.ts'
import type { Registrant } from '../../types/Doi.ts'

export type Server = keyof typeof servers

const servers = {
  preprintsorg: [Preprints.PreprintsorgPreprintId],
  scielo: [Preprints.ScieloPreprintId],
  zenodo: [Preprints.ZenodoPreprintId],
  'biorxiv-medrxiv': [Preprints.BiorxivPreprintId, Preprints.MedrxivPreprintId],
  ssrn: [Preprints.SsrnPreprintId],
  arxiv: [Preprints.ArxivPreprintId],
  researchsquare: [Preprints.ResearchSquarePreprintId],
  socarxiv: [Preprints.SocarxivPreprintId],
  edarxiv: [Preprints.EdarxivPreprintId],
  metaarxiv: [Preprints.MetaarxivPreprintId],
  lifecyclejournal: [Preprints.LifecycleJournalPreprintId],
  psycharchives: [Preprints.PsychArchivesPreprintId],
  osf: [Preprints.OsfPreprintId, Preprints.OsfPreprintsPreprintId],
  ecoevorxiv: [Preprints.EcoevorxivPreprintId],
  chemrxiv: [Preprints.ChemrxivPreprintId],
  authorea: [Preprints.AuthoreaPreprintId],
} as const

export const Servers = Record.keys(servers) as never as Array.NonEmptyReadonlyArray<Server>

export const isServer = (value: string): value is Server => value in servers

export const registrantsForServer = (
  server: Server,
): Array.NonEmptyReadonlyArray<Registrant<Preprints.PreprintIdWithDoi['value']>> =>
  Array.flatten(Array.map(servers[server], type => type.fields.value.registrants)) as never
