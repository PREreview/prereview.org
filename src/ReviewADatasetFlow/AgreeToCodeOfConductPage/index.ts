import type { UrlParams } from '@effect/platform'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Uuid } from '../../types/index.ts'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const AgreeToCodeOfConductPage = ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) => HavingProblemsPage

export const AgreeToCodeOfConductSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  datasetReviewId,
}: {
  body: UrlParams.UrlParams
  datasetReviewId: Uuid.Uuid
}) => HavingProblemsPage
