import { Context } from 'effect'
import type { Uuid } from '../../types/index.ts'

export class ZenodoRecordsConfig extends Context.Service<ZenodoRecordsConfig, { communityId: Uuid.Uuid }>()(
  'ZenodoRecordsConfig',
) {}
