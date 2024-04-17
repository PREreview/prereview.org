export interface CoarReviewActionOfferPayload {
  id: string
  '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify']
  type: ['Offer', 'coar-notify:ReviewAction']
  origin: {
    id: string
    inbox: string
    type: 'Service'
  }
  target: {
    id: string
    inbox: string
    type: 'Service'
  }
  object: {
    id: '10.1101/2024.02.07.578830'
    'ietf:cite-as': 'https://doi.org/10.1101/2024.02.07.578830'
  }
  actor: {
    id: 'https://prereview.org'
    type: 'Person'
    name: 'A PREreviewer'
  }
}
