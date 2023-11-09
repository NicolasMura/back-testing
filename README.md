# Back Testing

Frontend (Angular) Nx monorepo to simulate back-testing scenarios.

- [Back Testing](#back-testing)
  - [Requirements](#requirements)
  - [Dev Setup](#dev-setup)
  - [TODO to automate a little more :)](#todo-to-automate-a-little-more-)
  - [Cheat sheet](#cheat-sheet)

## Requirements

To contribute to this project and run it locally, you will need:

- [Node JS ^16.14.0 || ^18.10.0](https://nodejs.org/en)
- [Angular 16.x](https://angular.io/guide/versions)
- [Typescript >=4.9.3 <5.2.0](https://www.typescriptlang.org)
- [RXJS ^6.5.3 || ^7.4.0](https://rxjs.dev/)

## Dev Setup

```bash
  # install the dependencies
  yarn
  yarn add -g nx # not mandatory, you can use `npx nx` instead

  # run the app - it will start a server and livereload the app
  nx serve # or `npx nx serve`
```

## TODO to automate a little more :)

- Copy VS Code `settings.json`,
- Copy environments in `environments` folder
- Remove `apps/frontend/src/app/nx-welcome.component.ts` and update `apps/frontend/src/app/app.component.ts`
- Add a default project in `nx.json`
- Add `serve` script and a `lint-staged` block in `package.json` file

In short:

```bash
  cp <path_to_settings.json_file> .vscode
  cp <path_to_.prettierignore_file>  .
  cp -R <path_to_envs>/environments .
  rm apps/frontend/src/app/nx-welcome.component.ts
  sed -i '' 's/NxWelcomeComponent, //g' apps/frontend/src/app/app.component.ts
  sed -i '' 's/"targetDefaults": {/"defaultProject": "frontend",\n  "targetDefaults": {/g' nx.json
  sed -i '' 's/"scripts": {}/"scripts": {\n    "serve": "nx serve"\n  }/g' package.json
  sed -i '' 's/"private": true,/"private": true,\n  "lint-staged": {\n    "*": [\n      "prettier --cache --ignore-unknown --write"\n    ],\n    "*.{ts,js,html}": "eslint --cache --fix"\n  },/g' package.json
```

## Cheat sheet

This project was integrated in a [Nx](https://nx.dev) monorepo with the help of below command:

```bash
  npx create-nx-workspace@latest back-testing --preset=angular-monorepo --appName=frontend --e2eTestRunner=none --interactive=false --routing=true --standaloneApi=true --style=scss --nxCloud=false --packageManager=yarn
```

[ECharts + ngx-echarts](https://github.com/xieziyu/ngx-echarts) were installed with:

```bash
  yarn add echarts ngx-echarts
```
