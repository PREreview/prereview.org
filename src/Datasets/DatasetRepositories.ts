import { Array, Record } from 'effect'
import type { DatasetId } from '../Datasets/index.ts'
import { NonEmptyString } from '../types/NonEmptyString.ts'

const repositoryNames: Record<DatasetId['_tag'], NonEmptyString> = Record.map(
  {
    DryadDatasetId: 'Dryad',
    ScieloDatasetId: 'SciELO Data',
    ZenodoDatasetId: 'Zenodo',
  },
  NonEmptyString,
)

export const getRepositoryName = (datasetId: DatasetId): NonEmptyString => repositoryNames[datasetId._tag]

export const RepositoryNames: Array.NonEmptyReadonlyArray<NonEmptyString> = Array.dedupe(
  Record.values(repositoryNames) as never,
)
