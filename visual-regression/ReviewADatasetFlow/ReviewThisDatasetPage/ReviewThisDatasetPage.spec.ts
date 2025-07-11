import { Option } from 'effect'
import * as _ from '../../../src/ReviewADatasetFlow/ReviewThisDatasetPage/ReviewThisDatasetPage.js'
import { Orcid } from '../../../src/types/Orcid.js'
import { Pseudonym } from '../../../src/types/Pseudonym.js'
import type { User } from '../../../src/user.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.ReviewThisDatasetPage({ user: Option.none() })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when logged in', async ({ showPage }) => {
  const response = _.ReviewThisDatasetPage({ user: Option.some(user) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const user = {
  name: 'Josiah Carberry',
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User
