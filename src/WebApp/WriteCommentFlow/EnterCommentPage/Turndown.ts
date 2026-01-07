import TurndownService from 'turndown'

export const Turndown = new TurndownService({
  bulletListMarker: '-',
  emDelimiter: '*',
  headingStyle: 'atx',
}).keep(['sub', 'sup'])
