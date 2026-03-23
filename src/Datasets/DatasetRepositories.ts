import { Match } from 'effect'
import type { DatasetId } from '../Datasets/index.ts'

export const getRepositoryName = Match.typeTags<DatasetId, string>()({
  DryadDatasetId: () => 'Dryad',
})
