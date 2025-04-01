import type { Work } from './Work.js'

export const isWorkAPreprint = (work: Work): boolean => work.type === 'posted-content' && work.subtype === 'preprint'
