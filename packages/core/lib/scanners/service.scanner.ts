import { CORE_METADATA } from '../constants';
import { Klass, ReflectTool } from '@fastify-plus/common';

export class ServiceScanner {
  static scan(klasses: Klass[]) {
    return klasses.filter(
      k =>
        k.infix === 'service' ||
        !!ReflectTool.getOwnMetadata(CORE_METADATA.SERVICE, k.type),
    );
  }
}