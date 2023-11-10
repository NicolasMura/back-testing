import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ECharts, EChartsOption } from 'echarts';
import { DateTime } from 'luxon';
import { NgxEchartsModule } from 'ngx-echarts';
import {
  Observable,
  catchError,
  from,
  map,
  pairwise,
  startWith,
  switchMap,
} from 'rxjs';
import { Sheet2JSONOpts, WorkSheet, read, utils } from 'xlsx';

type DataT = {
  name: string;
  value: [string, number];
};

export interface RawLine {
  B: string;
  C: string;
}

interface Investment {
  name: string;
  code: string;
  isinCode: string;
  sheetname: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxEchartsModule],
  selector: 'back-testing-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private readonly destroy: DestroyRef = inject(DestroyRef);
  httpClient = inject(HttpClient);
  nnfb = inject(NonNullableFormBuilder);

  title = 'frontend';
  chartInstance!: ECharts;
  initOpts = {
    renderer: 'canvas',
    animation: 'linear',
  };
  options0!: EChartsOption;
  updateOptions0!: EChartsOption;
  loading!: boolean;

  investments: Investment[] = [
    {
      name: 'Lyxor PEA Monde (MSCI World) UCITS ETF - ELWD',
      code: 'ELWD',
      isinCode: 'FR0011869353',
      sheetname:
        'assets/Historique des VLs_Lyxor PEA Monde (MSCI World) UCITS ETF - Capi._FR0011869353_13_05_2014.xlsx',
    },
    {
      name: 'Lyxor MSCI World UCITS ETF - Dist - WLD',
      code: 'LWD',
      isinCode: 'FR0010315770',
      sheetname:
        'assets/Historique de performance_Lyxor MSCI World UCITS ETF - Dist_FR0010315770_27_07_2023.xlsx',
    },
    {
      name: 'Amundi PEA Monde (MSCI World) UCITS ETF - CW8',
      code: 'CW8',
      isinCode: 'LU1681043599',
      sheetname:
        'assets/Historique des VLs_Amundi MSCI World UCITS ETF - EUR (C)_LU1681043599_18_04_2018.xlsx',
    },
  ];
  startDates: string[] = [];
  endDates: string[] = [];
  form = this.nnfb.group({
    investment: [this.investments[0]],
    startDate: [new Date().toISOString().split('T')[0]],
    endDate: [new Date().toISOString().split('T')[0]],
    initialCapital: [
      1000,
      [
        Validators.required,
        CustomValidators.integer(),
        CustomValidators.strictlyPositive,
      ],
    ],
    monthlyAmount: [350, [Validators.required, CustomValidators.integer()]],
  });

  private data!: DataT[];

  ngOnInit(): void {
    // initialize chart
    this.initChart();

    this.loadSimulation(this.form.value.investment as Investment);

    this.form.valueChanges
      .pipe(startWith(null), pairwise(), takeUntilDestroyed(this.destroy))
      .subscribe(([prev, curr]) => {
        if (prev && curr && prev.investment !== curr.investment) {
          this.resetChart(curr.investment as Investment);
        }
        if (prev && curr && prev.startDate !== curr.startDate) {
          this.updateEndDates(curr.startDate as string);
        }
        if (prev && curr && prev.endDate !== curr.endDate) {
          this.updateStartDates(curr.endDate as string);
        }
      });
  }

  onChartInit(e: ECharts) {
    this.chartInstance = e;
  }

  initChart(): void {
    this.data = [];
    this.options0 = {
      title: {
        text: `Prix de ${this.form.value.investment?.name}`,
      },
      legend: {},
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          params = params[0];
          const date = new Date(params.name);
          return (
            date.getDate() +
            '/' +
            (date.getMonth() + 1) +
            '/' +
            date.getFullYear() +
            ' : ' +
            params.value[1]
          );
        },
        axisPointer: {
          animation: false,
        },
      },
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
        },
      },
      yAxis: {
        type: 'value',
        splitLine: {
          show: true,
        },
      },
      series: [
        {
          name: this.form.value.investment?.code,
          type: 'line',
          showSymbol: false,
          data: this.data,
        },
      ],
    };
  }

  resetChart(newInvestment: Investment): void {
    this.chartInstance.clear();
    this.initChart();
    this.loadSimulation(newInvestment);
  }

  updateEndDates(newStartDate: string): void {
    this.endDates = this.data
      .filter(
        (d) =>
          DateTime.fromISO(d.value[0]) >
          DateTime.fromISO(newStartDate as string)
      )
      .map((d) => d.value[0])
      .sort();
  }

  updateStartDates(newEndDate: string): void {
    this.startDates = this.data
      .filter(
        (d) =>
          DateTime.fromISO(d.value[0]) < DateTime.fromISO(newEndDate as string)
      )
      .map((d) => d.value[0])
      .sort();
  }

  loadSimulation(investment: Investment): void {
    this.loading = true;

    this.httpClient
      .get(investment.sheetname, { responseType: 'blob' })
      .pipe(
        catchError((err) => {
          console.error(err);
          this.loading = false;
          return [];
        }),
        map((res: Blob) => new File([res], 'etf.xlsx')),
        switchMap(this.loadRawLines.bind(this)),
        map((rawLines) => this.mapRawLinesToIndiceData(rawLines))
      )
      .subscribe((data) => {
        this.data = data;
        this.loading = false;
        this.updateOptions0 = {
          series: [
            {
              data: data,
            },
          ],
        };
        this.startDates = data.map((d) => d.value[0]).sort();
        this.endDates = [...this.startDates];
        this.startDates.pop();
        this.endDates.shift();

        this.form.patchValue({
          startDate: this.startDates[0],
          endDate: this.endDates[this.startDates.length - 1],
        });
      });
  }

  loadRawLines(file: File): Observable<RawLine[]> {
    return this.convertFileToRawLines(file).pipe(
      map(this.extractHeader.bind(this))
    );
  }

  private convertFileToRawLines(file: File): Observable<RawLine[]> {
    const options: Sheet2JSONOpts = {
      blankrows: false,
      header: 'A',
      raw: true,
      rawNumbers: false,
    };

    return from(this.getWorkSheetFromFile(file)).pipe(
      map((content) => {
        const firstRow = this.getFirstRow(content);
        if (!firstRow) throw new Error('No cell containing "VL officielle"!');
        return { content, firstRow };
      }),
      catchError(() => {
        throw new Error('No cell containing "VL officielle"!');
      }),
      map((result) =>
        utils.sheet_to_json(result.content, {
          ...options,
          range: result.firstRow,
        })
      )
    );
  }

  private async getWorkSheetFromFile(file: File): Promise<WorkSheet> {
    const fileContent = await file.arrayBuffer();
    const workBook = read(fileContent, { dateNF: 'dd/MM/yyyy' });
    const sheetName = workBook.SheetNames.find(
      (name) => name === 'Historique des VLs'
    );
    const sheetToTreat = sheetName && workBook.Sheets[sheetName];
    if (!sheetToTreat) throw new Error('Impossible to get worksheet from file');

    return sheetToTreat;
  }

  private getFirstRow(content: WorkSheet): number | undefined {
    // https://docs.sheetjs.com/docs/demos/bigdata/ml#importing-data-from-a-spreadsheet
    let firstRow = undefined;

    /* find worksheet range */
    const range = utils.decode_range(content['!ref'] as string);
    /* walk the columns */
    for (let c = range.s.c; c <= range.e.c; ++c) {
      /* walk the rows */
      for (let r = range.s.r; r <= range.e.r; ++r) {
        /* find the first cell containing 'VL officielle' */
        const currCell = content[utils.encode_cell({ c, r })];
        if (currCell?.w === 'VL officielle') {
          firstRow = r;
          break;
        }
      }
    }

    return firstRow;
  }

  private extractHeader(lines: RawLine[]): RawLine[] {
    const header = lines[0];
    if (!header) throw new Error('Empty file');
    // this.setter.setFileHeaders(header);
    return lines.slice(1);
  }

  private mapRawLinesToIndiceData(rawLines: RawLine[]): DataT[] {
    rawLines.forEach((rawLine) => {
      const split = rawLine.B.split('/');
      const date = new Date(
        parseFloat(split[2]),
        parseFloat(split[1]),
        parseFloat(split[0])
      );

      // check if we got a valid date
      if (date.getTime()) {
        const value = `${split[2]}-${split[1]}-${split[0]}`;
        this.data?.push(
          this.mapRawLineToIndiceData(rawLine, date.toString(), value)
        );
      }
    });

    return this.data;
  }

  private mapRawLineToIndiceData(
    rawLine: RawLine,
    date: string,
    valueXAxis: string
  ): DataT {
    return {
      name: date,
      value: [valueXAxis, parseFloat(rawLine.C.replace(',', '.'))],
    };
  }
}
export class CustomValidators {
  static pattern(regex: RegExp, errorName: string): ValidatorFn {
    return (control: AbstractControl) =>
      new RegExp(regex).test(control.value) ? null : { [errorName]: true };
  }

  static strictlyPositive(control: AbstractControl): ValidationErrors | null {
    const { value } = control;

    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== 'number') {
      return { isStrictlyPositive: { value } };
    }

    return value > 0 ? null : { isStrictlyPositive: { value } };
  }

  static integer(): ValidatorFn {
    return CustomValidators.pattern(/^-?\d+$/, 'integer');
  }
}
