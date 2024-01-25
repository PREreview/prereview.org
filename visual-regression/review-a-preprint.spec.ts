import * as TE from 'fp-ts/TaskEither'
import { reviewAPreprint } from '../src/review-a-preprint'
import { expect, test } from './base'

test('content looks right', async ({ showPage }) => {
  const response = await reviewAPreprint({ method: 'GET', body: undefined })({
    doesPreprintExist: () => TE.left('unavailable'),
  })()

  if (response._tag !== 'PageResponse') {
    throw new Error('incorrect page response')
  }

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
