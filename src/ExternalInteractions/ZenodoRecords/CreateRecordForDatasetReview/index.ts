import { Data, Effect } from 'effect'
import { Zenodo } from '../../../ExternalApis/index.ts'
import { html } from '../../../html.ts'
import { DatasetReviewToDepositMetadata, type DatasetReview } from './DatasetReviewToDepositMetadata.ts'

export class FailedToCreateRecordForDatasetReview extends Data.TaggedError('FailedToCreateRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const CreateRecordForDatasetReview = Effect.fn(
  function* (datasetReview: DatasetReview) {
    const depositMetadata = DatasetReviewToDepositMetadata(datasetReview)

    const deposition = yield* Zenodo.createDeposition({
      ...depositMetadata,
      description: html`
        <p>
          <strong
            >This Zenodo record is a permanently preserved version of a Structured PREreview. You can view the complete
            PREreview at <a href="${datasetReview.url.href}">${datasetReview.url.href}</a>.</strong
          >
        </p>

        ${depositMetadata.description}
      `,
    })

    yield* Zenodo.uploadFile(deposition, { content: depositMetadata.description.toString(), name: 'review.html' })

    return deposition.id
  },
  Effect.catchAll(error => new FailedToCreateRecordForDatasetReview({ cause: error })),
)
