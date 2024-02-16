import * as O from 'fp-ts/Option'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { createPage } from '../../src/my-details-page/my-details-page'
import type { EmailAddress } from '../../src/types/email-address'
import type { Pseudonym } from '../../src/types/pseudonym'
import type { NonEmptyString } from '../../src/types/string'
import type { User } from '../../src/user'
import type { UserOnboarding } from '../../src/user-onboarding'
import { expect, test } from '../base'

test('content looks right when publicly visible', async ({ showPage }) => {
  const response = createPage({
    user,
    userOnboarding,
    avatar: O.some(new URL('https://placehold.co/300x300')),
    orcidToken: O.some({
      accessToken: 'some-token' as NonEmptyString,
      scopes: new Set(['some-scope' as NonEmptyString]),
    }),
    slackUser: O.some({
      name: 'jcarberry',
      image: new URL('https://placehold.co/48x48'),
      profile: new URL('http://example.com/'),
    }),
    contactEmailAddress: O.some({ type: 'verified', value: 'some-email@example.com' as EmailAddress }),
    openForRequests: O.some({ value: true, visibility: 'public' }),
    careerStage: O.some({ value: 'mid', visibility: 'public' }),
    researchInterests: O.some({
      value:
        'Ut faucibus congue leo, quis rhoncus nulla venenatis vel. In iaculis commodo sodales. Mauris ut convallis nisl. Sed sit amet ex quis mi placerat elementum.' as NonEmptyString,
      visibility: 'public',
    }),
    location: O.some({
      value: 'Nulla porttitor eros dapibus quam convallis ultricies' as NonEmptyString,
      visibility: 'public',
    }),
    languages: O.some({
      value: 'Ut lobortis turpis et dolor tincidunt suscipit.' as NonEmptyString,
      visibility: 'public',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when restricted visible', async ({ showPage }) => {
  const response = createPage({
    user,
    userOnboarding,
    orcidToken: O.none,
    avatar: O.none,
    slackUser: O.some({
      name: 'jcarberry',
      image: new URL('https://placehold.co/48x48'),
      profile: new URL('http://example.com/'),
    }),
    contactEmailAddress: O.some({
      type: 'unverified',
      value: 'some-email@example.com' as EmailAddress,
      verificationToken: '9492b53b-ac19-4a6d-966c-5d2f27e80b83' as Uuid,
    }),
    openForRequests: O.some({ value: false, visibility: 'restricted' }),
    careerStage: O.some({ value: 'late', visibility: 'restricted' }),
    researchInterests: O.some({
      value:
        'Ut faucibus congue leo, quis rhoncus nulla venenatis vel. In iaculis commodo sodales. Mauris ut convallis nisl. Sed sit amet ex quis mi placerat elementum.' as NonEmptyString,
      visibility: 'restricted',
    }),
    location: O.some({
      value: 'Nulla porttitor eros dapibus quam convallis ultricies' as NonEmptyString,
      visibility: 'restricted',
    }),
    languages: O.some({
      value: 'Ut lobortis turpis et dolor tincidunt suscipit.' as NonEmptyString,
      visibility: 'restricted',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createPage({
    user,
    userOnboarding: { seenMyDetailsPage: false },
    slackUser: O.none,
    contactEmailAddress: O.none,
    openForRequests: O.none,
    careerStage: O.none,
    researchInterests: O.none,
    location: O.none,
    languages: O.none,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const user = {
  name: 'Josiah Carberry',
  orcid: '0000-0002-1825-0097' as Orcid,
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User

const userOnboarding = {
  seenMyDetailsPage: true,
} satisfies UserOnboarding
