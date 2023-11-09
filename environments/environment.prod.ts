import { base } from './base';
import { Environment } from './model';

export const environment: Environment = {
  ...base,
  env: 'prod',
  apiBasePath: 'https://<DOMAIN_PROD>/<MICRO_SERVICE>/v1',
};
