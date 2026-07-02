/** Live earthquakes for Venezuela, refreshed on the configured cadence. */

import { REFRESH_INTERVALS } from '../config/constants'
import { fetchEarthquakes } from '../services/earthquakeService'
import type { AsyncState } from '../types/asyncState'
import type { Earthquake } from '../types/domain'
import { useLiveData } from './useLiveData'

/** @returns Async state holding the latest earthquakes. */
export function useEarthquakes(): AsyncState<Earthquake[]> {
  return useLiveData<Earthquake[]>(
    (signal) => fetchEarthquakes(signal),
    REFRESH_INTERVALS.earthquakes,
    { cacheKey: 'earthquakes' },
  )
}
