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
    id: string
    'ietf:cite-as': string
  }
  actor: {
    id: 'https://prereview.org'
    type: 'Person'
    name: 'A PREreviewer'
  }
}
