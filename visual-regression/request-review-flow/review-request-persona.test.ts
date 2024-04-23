import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import type { Orcid } from 'orcid-id-ts'
import { missingE } from '../../src/form'
import { personaForm } from '../../src/request-review-flow/persona-page/persona-form'
import type { ReviewRequestPreprintId } from '../../src/review-request'
import type { Pseudonym } from '../../src/types/pseudonym'
import type { User } from '../../src/user'
import { expect, test } from '../base'

const user = {
  name: 'Josiah Carberry',
  orcid: '0000-0002-1825-0097' as Orcid,
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User

const preprint = {
  type: 'biorxiv',
  value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
} satisfies ReviewRequestPreprintId

test('content looks right', async ({ showPage }) => {
  const response = personaForm({
    form: { persona: E.right(undefined) },
    preprint,
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = personaForm({
    form: { persona: E.left(missingE()) },
    preprint,
    user,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})