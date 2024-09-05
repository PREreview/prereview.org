import { Doi } from 'doi-ts'
import { unknownPreprintPage } from '../../src/request-a-prereview-page/unknown-preprint-page.js'
import { expect, test } from '../base.js'

test('content looks right with a DOI ID', async ({ showPage }) => {
  const response = unknownPreprintPage({ type: 'biorxiv', value: Doi('10.1101/2022.01.13.476201') })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a PhilSci ID', async ({ showPage }) => {
  const response = unknownPreprintPage({ type: 'philsci', value: 21986 })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
