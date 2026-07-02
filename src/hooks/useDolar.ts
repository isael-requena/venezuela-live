/** Live USD exchange rates (BCV + parallel), refreshed periodically. */

import { REFRESH_INTERVALS } from '../config/constants'
import { fetchDolarRates } from '../services/dolarService'
import type { AsyncState } from '../types/asyncState'
import type { DolarRate } from '../types/domain'
import { useLiveData } from './useLiveData'

/** @returns Async state holding the latest exchange rates. */
export function useDolar(): AsyncState<DolarRate[]> {
  return useLiveData<DolarRate[]>((signal) => fetchDolarRates(signal), REFRESH_INTERVALS.dolar, {
    cacheKey: 'dolar',
  })
}
