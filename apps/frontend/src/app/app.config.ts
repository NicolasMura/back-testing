import { HttpClientModule } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import {
  provideRouter,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { NgxEchartsModule } from 'ngx-echarts';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      HttpClientModule,
      NgxEchartsModule.forRoot({
        echarts: () => import('echarts'),
      })
    ),
    provideRouter(appRoutes, withEnabledBlockingInitialNavigation()),
  ],
};
