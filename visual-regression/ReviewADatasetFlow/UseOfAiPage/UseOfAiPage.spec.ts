import { Option } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as UseOfAiForm from '../../../src/WebApp/ReviewADatasetFlow/UseOfAiPage/UseOfAiForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/UseOfAiPage/UseOfAiPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.UseOfAiPage({
    datasetReviewId,
    form: new UseOfAiForm.EmptyForm(),
    locale: DefaultLocale,
    otherAuthors: false,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = _.UseOfAiPage({
    datasetReviewId,
    form: new UseOfAiForm.EmptyForm(),
    locale: DefaultLocale,
    otherAuthors: true,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a choice', async ({ showPage }) => {
  const response = _.UseOfAiPage({
    datasetReviewId,
    form: new UseOfAiForm.CompletedForm({
      generativeAiIdeas: 'yes',
      generativeAiIdeasDetails: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    }),
    locale: DefaultLocale,
    otherAuthors: false,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is no', async ({ showPage }) => {
  const response = _.UseOfAiPage({
    datasetReviewId,
    form: new UseOfAiForm.CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
    locale: DefaultLocale,
    otherAuthors: false,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
