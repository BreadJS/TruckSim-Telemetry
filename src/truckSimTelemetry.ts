import { EventEmitter } from 'node:events';
import { createBufferReader } from './buffer/bufferReader';
import { allocateTelemetryData } from './data/allocateTelemetryData';
import { getBuffer } from './buffer/getBuffer';
import type { SCSSDKTelemetry } from './types';
import { updateTelemetryData } from './data/updateTelemetryData';
import { handleEvents } from './events/handleEvents';
import type { TSTConfig } from './createConfig';
import type {
  TSTFerryEvent,
  TSTFineEvent,
  TSTRefuelPaidEvent,
  TSTTollgateEvent,
  TSTTrainEvent
} from './events/handleGameEvents';
import type {
  TSTJobStartedEvent,
  TSTJobDeliveredEvent,
  TSTJobCancelledEvent
} from './main';
import type {
  TSTCruiseControlEvent,
  TSTEmergencyEvent,
  TSTRefuelEvent,
  TSTGearChangeEvent,
  TSTRetarderEvent,
  TSTWarningEvent
} from './events/handleTruckEvents';

type EventCallbacks = {
  'connected':     () => void;
  'disconnected':  () => void;
  // Game
  'pause':         (isPaused: boolean)         => void;
  'time':          (timeAbs: number)           => void;
  'fine':          (event: TSTFineEvent)       => void;
  'refuel-paid':   (event: TSTRefuelPaidEvent) => void;
  'tollgate':      (event: TSTTollgateEvent)   => void;
  'ferry':         (event: TSTFerryEvent)      => void;
  'train':         (event: TSTTrainEvent)      => void;
  // Navigation
  'speed-limit':   (speedLimit: number)  => void;
  // Job
  'job-started':   (event: TSTJobStartedEvent)   => void;
  'job-delivered': (event: TSTJobDeliveredEvent) => void;
  'job-finished':  ()                            => void;
  'job-cancelled': (event: TSTJobCancelledEvent) => void;
  // Truck
  'cruise-control':          (event: TSTCruiseControlEvent) => void;
  'cruise-control-increase': (event: TSTCruiseControlEvent) => void;
  'cruise-control-decrease': (event: TSTCruiseControlEvent) => void;
  'electric':                (isEnabled: boolean)           => void;
  'emergency':               (event: TSTEmergencyEvent)     => void;
  'engine':                  (isEnabled: boolean)           => void;
  'gear-change':             (event: TSTGearChangeEvent)    => void;
  'park-brake':              (isEnabled: boolean)           => void;
  'refuel-start':            (event: TSTRefuelEvent)        => void;
  'refuel-stop':             (event: TSTRefuelEvent)        => void;
  'retarder':                (event: TSTRetarderEvent)      => void;
  'warning':                 (event: TSTWarningEvent)       => void;
  'wipers':                  (isEnabled: boolean)           => void;
  // Trailers
  'trailer-attached': (index: number) => void;
  'trailer-detached': (index: number) => void;

}

export class TruckSimTelemetry extends EventEmitter {
  data: {
    current: SCSSDKTelemetry;
    previous: SCSSDKTelemetry;
  };

  constructor() {
    super();
    this.data = {
      current:  allocateTelemetryData(),
      previous: allocateTelemetryData(),
    };
  }

  on<T extends keyof EventCallbacks>(event: T, listener: EventCallbacks[T]): this {
    return super.on(event, listener);
  }

  once<T extends keyof EventCallbacks>(event: T, listener: EventCallbacks[T]): this {
    return super.once(event, listener);
  }

  emit<T extends keyof EventCallbacks>(event: T, ...args: Parameters<EventCallbacks[T]>): boolean {
    return super.emit(event, ...args);
  }
}

export interface TSTOptions extends TSTConfig {
  onUpdate?: (data: SCSSDKTelemetry) => void;
}

/**
 * Creates an event listener that emits telemetry events.
 *
 * @example
 * ```ts
 * import { truckSimTelemetry } from 'trucksim-telemetry';
 *
 * const telemetry = truckSimTelemetry();
 *
 * telemetry.on('connected', () => {
 *   console.log('SDK connected');
 * });
 * ```
 */
export function truckSimTelemetry(opts?: TSTOptions): TruckSimTelemetry {
  const tst = new TruckSimTelemetry();
  const bufferReader = createBufferReader();

  // Initialize
  const initialBuffer = getBuffer(opts);
  if (initialBuffer) {
    bufferReader.setBuffer(initialBuffer);
    updateTelemetryData(tst.data.current, bufferReader);
    updateTelemetryData(tst.data.previous, bufferReader);
  }

  setInterval(() => {
    const buffer = getBuffer(opts);

    // Only update if we have a valid buffer (game is running)
    if (buffer) {
      bufferReader.setBuffer(buffer);
      updateTelemetryData(tst.data.current, bufferReader);
      handleEvents(tst);
      if (opts?.onUpdate) {
        opts.onUpdate(tst.data.current);
      }
      updateTelemetryData(tst.data.previous, bufferReader);
    } else {
      // Buffer is null (game not running), emit disconnected event
      if (tst.data.current.sdkActive) {
        // We were connected, now we're not
        tst.emit('disconnected');
      }
      // Mark as not active
      tst.data.current.sdkActive = false;
    }
  }, 1000 / 60);

  return tst;
}
