// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import scsSDKTelemetry from '../../build/Release/scsSDKTelemetry.node';
import { createConfig, type TSTConfig } from '../createConfig';

/**
 * Gets the shared memory buffer for telemetry data.
 *
 * @example
 * ```ts
 * import { getBuffer } from 'trucksim-telemetry';
 *
 * const buffer = getBuffer();
 * const bufferWithCustomConfig = getBuffer({ sharedMemoryName: '/CustomTelemetry' });
 * ```
 */
export const getBuffer = function(config: TSTConfig = {}): Buffer | null {
  // Merge provided config with defaults
  const mergedConfig = { ...createConfig(), ...config };

  try {
    const buffer = scsSDKTelemetry.getBuffer(mergedConfig.sharedMemoryName);
    return buffer;
  } catch (err) {
    return null;
  }
};
