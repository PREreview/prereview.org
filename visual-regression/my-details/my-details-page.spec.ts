import { HashSet, Option } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { Uuid } from 'uuid-ts'
import { UnverifiedContactEmailAddress, VerifiedContactEmailAddress } from '../../src/contact-email-address.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { createPage } from '../../src/my-details-page/my-details-page.js'
import { EmailAddress } from '../../src/types/EmailAddress.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { Pseudonym } from '../../src/types/Pseudonym.js'
import type { UserOnboarding } from '../../src/user-onboarding.js'
import type { User } from '../../src/user.js'
import { expect, test } from '../base.js'

test('content looks right when publicly visible', async ({ showPage }) => {
  const response = createPage({
    user,
    locale: DefaultLocale,
    userOnboarding,
    avatar: Option.some(new URL('https://placehold.co/300x300')),
    orcidToken: Option.some({
      accessToken: NonEmptyString('some-token'),
      scopes: HashSet.make(NonEmptyString('some-scope')),
    }),
    slackUser: Option.some({
      name: 'jcarberry',
      image: new URL('https://placehold.co/48x48'),
      profile: new URL('http://example.com/'),
    }),
    contactEmailAddress: Option.some(
      new VerifiedContactEmailAddress({ value: EmailAddress('some-email@example.com') }),
    ),
    openForRequests: Option.some({ value: true, visibility: 'public' }),
    careerStage: Option.some({ value: 'mid', visibility: 'public' }),
    researchInterests: Option.some({
      value: NonEmptyString(
        'Ut faucibus congue leo, quis rhoncus nulla venenatis vel. In iaculis commodo sodales. Mauris ut convallis nisl. Sed sit amet ex quis mi placerat elementum.',
      ),
      visibility: 'public',
    }),
    location: Option.some({
      value: NonEmptyString('Nulla porttitor eros dapibus quam convallis ultricies'),
      visibility: 'public',
    }),
    languages: Option.some({
      value: NonEmptyString('Ut lobortis turpis et dolor tincidunt suscipit.'),
      visibility: 'public',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when restricted visible', async ({ showPage }) => {
  const response = createPage({
    user,
    locale: DefaultLocale,
    userOnboarding,
    orcidToken: Option.none(),
    avatar: Option.none(),
    slackUser: Option.some({
      name: 'jcarberry',
      image: new URL('https://placehold.co/48x48'),
      profile: new URL('http://example.com/'),
    }),
    contactEmailAddress: Option.some(
      new UnverifiedContactEmailAddress({
        value: EmailAddress('some-email@example.com'),
        verificationToken: Uuid('9492b53b-ac19-4a6d-966c-5d2f27e80b83'),
      }),
    ),
    openForRequests: Option.some({ value: false, visibility: 'restricted' }),
    careerStage: Option.some({ value: 'late', visibility: 'restricted' }),
    researchInterests: Option.some({
      value: NonEmptyString(
        'Ut faucibus congue leo, quis rhoncus nulla venenatis vel. In iaculis commodo sodales. Mauris ut convallis nisl. Sed sit amet ex quis mi placerat elementum.',
      ),
      visibility: 'restricted',
    }),
    location: Option.some({
      value: NonEmptyString('Nulla porttitor eros dapibus quam convallis ultricies'),
      visibility: 'restricted',
    }),
    languages: Option.some({
      value: NonEmptyString('Ut lobortis turpis et dolor tincidunt suscipit.'),
      visibility: 'restricted',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createPage({
    user,
    locale: DefaultLocale,
    userOnboarding: { seenMyDetailsPage: false },
    orcidToken: Option.none(),
    avatar: Option.none(),
    slackUser: Option.none(),
    contactEmailAddress: Option.none(),
    openForRequests: Option.none(),
    careerStage: Option.none(),
    researchInterests: Option.none(),
    location: Option.none(),
    languages: Option.none(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const user = {
  name: 'Josiah Carberry',
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User

const userOnboarding = {
  seenMyDetailsPage: true,
} satisfies UserOnboarding
