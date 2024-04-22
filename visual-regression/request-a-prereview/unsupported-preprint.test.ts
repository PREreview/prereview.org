import type { Doi } from 'doi-ts'
import { unsupportedPreprintPage } from '../../src/request-a-prereview-page/unsupported-preprint-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = unsupportedPreprintPage({ type: 'biorxiv', value: '10.1101/2022.01.13.476201' as Doi<'1101'> })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
