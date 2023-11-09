export interface Environment {
  env: 'local' | 'dev' | 'prod';

  apiBasePath: string;
  buildVersion: string;
}
