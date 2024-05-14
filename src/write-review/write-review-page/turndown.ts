import TurndownService from 'turndown'

export const turndown = new TurndownService({
  bulletListMarker: '-',
  emDelimiter: '*',
  headingStyle: 'atx',
}).keep(['sub', 'sup'])
