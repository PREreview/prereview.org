import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.js'
import type { NonEmptyString, Uuid } from '../../../src/types/index.js'
import * as CompetingInterestsForm from '../../../src/WriteFeedbackFlow/CompetingInterestsPage/CompetingInterestsForm.js'
import * as _ from '../../../src/WriteFeedbackFlow/CompetingInterestsPage/CompetingInterestsPage.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.CompetingInterestsPage({
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    form: new CompetingInterestsForm.EmptyForm(),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are details', async ({ showPage }) => {
  const response = _.CompetingInterestsPage({
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    form: new CompetingInterestsForm.CompletedFormYes({
      competingInterests: 'yes',
      competingInterestsDetails:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' as NonEmptyString.NonEmptyString,
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when missing', async ({ showPage }) => {
  const response = _.CompetingInterestsPage({
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    form: new CompetingInterestsForm.InvalidForm({
      competingInterests: Either.left(new CompetingInterestsForm.Missing()),
      competingInterestsDetails: Either.right(''),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when details are missing', async ({ showPage }) => {
  const response = _.CompetingInterestsPage({
    feedbackId: '7ad2f67d-dc01-48c5-b6ac-3490d494f67d' as Uuid.Uuid,
    form: new CompetingInterestsForm.InvalidForm({
      competingInterests: Either.right('yes'),
      competingInterestsDetails: Either.left(new CompetingInterestsForm.Missing()),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
