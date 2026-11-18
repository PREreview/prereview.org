import { Data } from 'effect'
import type { Persona } from '../../Prereviewers/index.ts'
import type { PreprintReviewForSciety } from './ListPreprintReviewsForSciety.ts'

export type PublishedPreprintReviewForSciety = Omit<PreprintReviewForSciety, 'authors'> & {
  readonly authors: ReadonlyArray<Persona>
}

export class PrereviewsAreUnavailable extends Data.TaggedError('PrereviewsAreUnavailable')<{ cause?: unknown }> {}
