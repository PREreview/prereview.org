import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { Orcid } from 'orcid-id-ts'
import type { PreprintId } from '../Preprints/index.js'

export interface RapidPrereview {
  author: {
    name: string
    orcid?: Orcid
  }
  questions: {
    availableCode: 'yes' | 'unsure' | 'na' | 'no'
    availableData: 'yes' | 'unsure' | 'na' | 'no'
    coherent: 'yes' | 'unsure' | 'na' | 'no'
    ethics: 'yes' | 'unsure' | 'na' | 'no'
    future: 'yes' | 'unsure' | 'na' | 'no'
    limitations: 'yes' | 'unsure' | 'na' | 'no'
    methods: 'yes' | 'unsure' | 'na' | 'no'
    newData: 'yes' | 'unsure' | 'na' | 'no'
    novel: 'yes' | 'unsure' | 'na' | 'no'
    peerReview: 'yes' | 'unsure' | 'na' | 'no'
    recommend: 'yes' | 'unsure' | 'na' | 'no'
    reproducibility: 'yes' | 'unsure' | 'na' | 'no'
  }
}

export interface GetRapidPrereviewsEnv {
  getRapidPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<RapidPrereview>>
}

export const getRapidPrereviews = (
  id: PreprintId,
): RTE.ReaderTaskEither<GetRapidPrereviewsEnv, 'unavailable', ReadonlyArray<RapidPrereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getRapidPrereviews }) => getRapidPrereviews(id)))
