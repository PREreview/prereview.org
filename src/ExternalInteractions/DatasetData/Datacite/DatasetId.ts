import type { Array } from 'effect'
import type * as Datasets from '../../../Datasets/index.ts'
import { Doi } from '../../../types/index.ts'

const dataciteDoiPrefixes = [
  '5061',
  '5068',
  '6071',
  '6078',
  '6086',
  '7272',
  '7280',
  '7291',
  '15146',
  '25338',
  '25349',
] satisfies Array.NonEmptyReadonlyArray<Doi.Registrant<Datasets.DatasetId['value']>>

type DataciteDoiPrefix = (typeof dataciteDoiPrefixes)[number]

export type DataciteDatasetId = Extract<Datasets.DatasetId, { value: Doi.Doi<DataciteDoiPrefix> }>

export const IsDataciteDatasetId = (id: Datasets.DatasetId): id is DataciteDatasetId =>
  Doi.hasRegistrant(...dataciteDoiPrefixes)(id.value)
