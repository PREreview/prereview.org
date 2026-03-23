import { Match } from 'effect'
import type { DatasetId } from '../Datasets/index.ts'

export const getName = Match.typeTags<DatasetId, string>()({
  DryadDatasetId: () => 'Dryad',
})
