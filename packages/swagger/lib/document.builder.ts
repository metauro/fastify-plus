import fastifySwagger from 'fastify-swagger';
import { merge, defaults } from 'lodash';
import { FastifyPlusApplication } from '@fastify-plus/core';
import {
  Info,
  OpenApi,
  OpenApiScanner,
  Responses,
} from '@fastify-plus/openapi';
import { internalLoggerService, ObjectTool } from '@fastify-plus/common';

export class DocumentBuilder {
  static create(app: FastifyPlusApplication) {
    return new DocumentBuilder(app);
  }

  protected document: OpenApi & {
    host: string;
    basePath: string;
    schemes: string[];
  } = {
    openapi: '3.0.2',
    info: {
      title: '',
      version: '',
    },
    components: {},
    paths: {},
    host: '',
    basePath: '',
    schemes: ['http', 'https'],
  };

  protected hasGlobalResponses = false;

  constructor(protected readonly app: FastifyPlusApplication) {
    const { klasses } = app.getContext();
    merge(this.document, OpenApiScanner.scan(klasses));
    this.resetNonsupportFormat();
  }

  private resetNonsupportFormat() {
    const nonsupportFormats = [
      'time',
      'uri',
      'uri-reference',
      'uri-template',
      'email',
      'hostname',
      'ipv4',
      'ipv6',
      'regex',
      'uuid',
      'json-pointer',
      'relative-json-pointer',
    ];

    ObjectTool.walk(this.document, (key, val, obj) => {
      if (key === 'format' && nonsupportFormats.includes(val)) {
        delete obj[key];
      }
    });
  }

  setInfo(info: Info) {
    merge(this.document, info);
    return this;
  }

  setHost(host: string) {
    this.document.host = host;
    return this;
  }

  setBasePath(basePath: string) {
    this.document.basePath = basePath;
    return this;
  }

  setSchemes(schemes: Array<'http' | 'https' | string>) {
    this.document.schemes = schemes;
    return this;
  }

  setGlobalResponses(responses: Responses) {
    this.hasGlobalResponses = true;
    Object.keys(this.document.paths).forEach(path => {
      const pathItem = this.document.paths[path];
      Object.keys(pathItem).forEach(method => {
        const operation = pathItem[method];
        defaults(operation.responses, responses);
      });
    });
    return this;
  }

  build() {
    if (!this.hasGlobalResponses) {
      this.setGlobalResponses({
        '404': {
          description: 'Resource Not Found',
        },
        '405': {
          description: 'Method Not Allow',
        },
      });
    }

    internalLoggerService.info('map swagger to /api-doc');
    this.app.getFastifyInstance().register(fastifySwagger, {
      mode: 'static',
      specification: {
        document: this.document,
      },
      exposeRoute: true,
      routePrefix: '/api-doc',
    });
  }
}