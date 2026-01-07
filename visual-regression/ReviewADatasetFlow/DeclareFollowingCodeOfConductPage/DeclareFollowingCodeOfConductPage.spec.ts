import { Either } from 'effect'
import * as DeclareFollowingCodeOfConductForm from '../../../src/WebApp/ReviewADatasetFlow/DeclareFollowingCodeOfConductPage/DeclareFollowingCodeOfConductForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/DeclareFollowingCodeOfConductPage/DeclareFollowingCodeOfConductPage.ts'
import { Uuid } from '../../../src/types/index.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.DeclareFollowingCodeOfConductPage({
    datasetReviewId,
    form: new DeclareFollowingCodeOfConductForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a declaration', async ({ showPage }) => {
  const response = _.DeclareFollowingCodeOfConductPage({
    datasetReviewId,
    form: new DeclareFollowingCodeOfConductForm.CompletedForm({
      followingCodeOfConduct: 'yes',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the declaration is missing', async ({ showPage }) => {
  const response = _.DeclareFollowingCodeOfConductPage({
    datasetReviewId,
    form: new DeclareFollowingCodeOfConductForm.InvalidForm({
      followingCodeOfConduct: Either.left(new DeclareFollowingCodeOfConductForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
