import { Option } from 'effect'
import * as _ from '../../../src/ReviewADatasetFlow/ReviewThisDatasetPage/ReviewThisDatasetPage.js'
import { NonEmptyString } from '../../../src/types/NonEmptyString.js'
import { OrcidId } from '../../../src/types/OrcidId.js'
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
  name: NonEmptyString('Josiah Carberry'),
  orcid: OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User
