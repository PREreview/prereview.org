import { Temporal } from '@js-temporal/polyfill'
import * as RT from 'fp-ts/ReaderTask'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as T from 'fp-ts/Task'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import {
  type CanRequestReviewsEnv,
  type CanSeeReviewRequestsEnv,
  canRequestReviews,
  canSeeReviewRequests,
} from '../feature-flags'
import type { Html } from '../html'
import type { PageResponse } from '../response'
import type { ClubId } from '../types/club-id'
import type { PreprintId } from '../types/preprint-id'
import type { User } from '../user'
import { createPage } from './home-page'

import PlainDate = Temporal.PlainDate

export interface RecentPrereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly published: PlainDate
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

interface GetRecentPrereviewsEnv {
  getRecentPrereviews: () => T.Task<ReadonlyArray<RecentPrereview>>
}

const getRecentPrereviews = () =>
  pipe(
    RT.ask<GetRecentPrereviewsEnv>(),
    RT.chainTaskK(({ getRecentPrereviews }) => getRecentPrereviews()),
  )

export const home = ({
  user,
}: {
  user?: User
}): RT.ReaderTask<CanRequestReviewsEnv & CanSeeReviewRequestsEnv & GetRecentPrereviewsEnv, PageResponse> =>
  pipe(
    RT.Do,
    RT.apS('recentPrereviews', getRecentPrereviews()),
    RT.apSW('canRequestReviews', user ? RT.fromReader(canRequestReviews(user)) : RT.of(false)),
    RT.apSW('canSeeReviewRequests', user ? RT.fromReader(canSeeReviewRequests(user)) : RT.of(false)),
    RT.map(createPage),
  )
