import type { components } from './schema'

type Schemas = components['schemas']

export type Meta = Schemas['MetaResponse']
export type Metrics = Schemas['MetricsOut']
export type Slot = Schemas['SlotOut']
export type DecisionResponse = Schemas['ForecastAtDecisionResponse']
export type AccuracyResponse = Schemas['AccuracyResponse']
export type HorizonBucket = Schemas['HorizonBucketOut']
export type HourBucket = Schemas['HourBucketOut']
