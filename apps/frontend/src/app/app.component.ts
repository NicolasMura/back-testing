import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import { Observable, catchError, from, map, switchMap } from 'rxjs';
import { Sheet2JSONOpts, WorkSheet, read, utils } from 'xlsx';

type DataT = {
  name: string;
  value: [string, number];
};

export interface UploadRawLine {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface UploadNumberedRawLine extends UploadRawLine {
  lineNumber: string;
}

@Component({
  standalone: true,
  imports: [NgxEchartsModule],
  selector: 'back-testing-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  httpClient = inject(HttpClient);
  title = 'frontend';

  // First example

  options1!: EChartsOption;
  updateOptions1!: EChartsOption;

  private oneDay = 24 * 3600 * 1000;
  private now!: Date;
  private value!: number;
  private data!: DataT[];
  private timer!: any;

  ngOnInit(): void {
    // generate some random testing data:
    this.data = [];
    this.now = new Date(1997, 9, 3);
    this.value = Math.random() * 1000;

    for (let i = 0; i < 1000; i++) {
      this.data.push(this.randomData());
    }

    // initialize chart options:
    this.options1 = {
      title: {
        text: 'Dynamic Data + Time Axis',
      },
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
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        boundaryGap: [0, '100%'],
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          name: 'Mocking Data',
          type: 'line',
          showSymbol: false,
          data: this.data,
        },
      ],
    };

    // Mock dynamic data:
    // this.timer = setInterval(() => {
    //   for (let i = 0; i < 5; i++) {
    //     this.data.shift();
    //     this.data.push(this.randomData());
    //   }

    //   // update series data:
    //   this.updateOptions1 = {
    //     series: [
    //       {
    //         data: this.data,
    //       },
    //     ],
    //   };
    // }, 1000);

    this.httpClient
      .get(
        'assets/Historique des VLs_Lyxor PEA Monde (MSCI World) UCITS ETF - Capi._FR0011869353_13_05_2014.xlsx',
        // 'assets/Historique de performance_Lyxor MSCI World UCITS ETF - Dist_FR0010315770_27_07_2023.xlsx',
        // 'assets/Historique des VLs_Amundi MSCI World UCITS ETF - EUR (C)_LU1681043599_18_04_2018.xlsx',
        { responseType: 'blob' }
      )
      .pipe(
        map((res: Blob) => new File([res], 'etf.xlsx')),
        switchMap(this.loadRawLines.bind(this))
      )
      .subscribe();
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  randomData(): DataT {
    this.now = new Date(this.now.getTime() + this.oneDay);
    this.value = this.value + Math.random() * 21 - 10;
    return {
      name: this.now.toString(),
      value: [
        [
          this.now.getFullYear(),
          this.now.getMonth() + 1,
          this.now.getDate(),
        ].join('/'),
        Math.round(this.value),
      ],
    };
  }

  // Second example

  options2: EChartsOption = {
    legend: {},
    tooltip: {},
    dataset: {
      // Provide a set of data.
      source: [
        ['product', '2015', '2016', '2017'],
        ['Matcha Latte', 43.3, 85.8, 93.7],
        ['Milk Tea', 83.1, 73.4, 55.1],
        ['Cheese Cocoa', 86.4, 65.2, 82.5],
        ['Walnut Brownie', 72.4, 53.9, 39.1],
      ],
    },
    // Declare an x-axis (category axis).
    // The category map the first column in the dataset by default.
    xAxis: { type: 'category' },
    // Declare a y-axis (value axis).
    yAxis: {},
    // Declare several 'bar' series,
    // every series will auto-map to each column by default.
    series: [{ type: 'bar' }, { type: 'bar' }, { type: 'bar' }],
  };

  mergeOptions2!: EChartsOption;

  RandomDataset() {
    this.mergeOptions2 = {
      dataset: {
        source: [
          ['product', '2015', '2016', '2017'],
          ['Matcha Latte', ...this.getRandomValues()],
          ['Milk Tea', ...this.getRandomValues()],
          ['Cheese Cocoa', ...this.getRandomValues()],
          ['Walnut Brownie', ...this.getRandomValues()],
        ],
      },
    };
  }

  private getRandomValues() {
    const res: number[] = [];
    for (let i = 0; i < 3; i++) {
      res.push(Math.random() * 100);
    }
    return res;
  }

  loadRawLines(file: File): Observable<any[]> {
    // loadRawLines(file: File): Observable<UploadNumberedRawLine[]> {
    return this.convertFileToRawLines(file).pipe(
      map(this.extractHeader.bind(this)),
      map(this.mapWithLineNumber.bind(this))
    );
  }

  private convertFileToRawLines(file: File): Observable<UploadRawLine[]> {
    const options: Sheet2JSONOpts = {
      blankrows: false,
      header: 1,
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
    let firstRow = undefined;

    /* find worksheet range */
    const range = utils.decode_range(content['!ref'] as string);
    /* walk the columns */
    for (let c = range.s.c; c <= range.e.c; ++c) {
      /* walk the rows */
      for (let r = range.s.r; r <= range.e.r; ++r) {
        /* find the first cell containing 'VL officielle' */
        const currentCell = content[utils.encode_cell({ c, r })];
        if (currentCell?.w === 'VL officielle') {
          firstRow = r;
          break;
        }
      }
    }

    return firstRow;
  }

  private extractHeader(lines: UploadRawLine[]): UploadRawLine[] {
    const header = lines[0];
    if (!header) throw new Error('Empty file');
    // this.setter.setFileHeaders(header);
    return lines.slice(1);
  }

  private mapWithLineNumber(
    rawLines: UploadRawLine[]
  ): UploadNumberedRawLine[] {
    return rawLines.map((rawLine, index) => ({
      ...rawLine,
      lineNumber: (index + 2).toString(),
    }));
  }
}
