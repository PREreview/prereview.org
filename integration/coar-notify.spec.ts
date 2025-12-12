import { test as baseTest, canLogIn, enableCoarNotifyInbox, expect } from './base.ts'

const test = baseTest.extend(enableCoarNotifyInbox)

test.extend(canLogIn)('can request a review', async ({ baseURL, page, request }) => {
  await request.post('/inbox', {
    failOnStatusCode: true,
    data: {
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://coar-notify.net'],
      actor: {
        id: 'https://orcid.org/0000-0002-1825-0097',
        name: 'Josiah Carberry',
        type: 'Person',
      },
      id: 'urn:uuid:0370c0fb-bb78-4a9b-87f5-bed307a509dd',
      object: {
        id: 'https://research-organisation.org/repository/preprint/201203/421/',
        'ietf:cite-as': 'https://doi.org/10.1101/2023.02.28.529746',
        type: ['Page', 'sorg:AboutPage'],
      },
      origin: {
        id: 'https://www.biorxiv.org/',
        inbox: 'https://api.biorxiv.org/coar_inbox/',
        type: 'Service',
      },
      target: {
        id: `${baseURL}/`,
        inbox: `${baseURL}/inbox/`,
        type: 'Service',
      },
      type: ['Offer', 'coar-notify:ReviewAction'],
    },
  })

  await expect(async () => {
    await page.goto('/', { waitUntil: 'commit' })

    await expect(page.getByRole('region', { name: 'Recent review requests' })).toContainText(
      'A conserved local structural motif controls the kinetics of PTP1B catalysis',
    )
    await expect(page.getByRole('region', { name: 'Recent review requests' })).toContainText(
      'Molecular BiologyImmunology',
    )
  }).toPass()
})
