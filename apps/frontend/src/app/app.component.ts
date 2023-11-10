import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import { Observable, catchError, from, map, switchMap } from 'rxjs';
import { Sheet2JSONOpts, WorkSheet, read, utils } from 'xlsx';

type DataT = {
  name: string;
  value: [string, number];
};

export interface RawLine {
  B: string;
  C: string;
}

@Component({
  standalone: true,
  imports: [NgxEchartsModule],
  selector: 'back-testing-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  httpClient = inject(HttpClient);
  title = 'frontend';
  initOpts = {
    renderer: 'canvas',
    animation: 'linear',
  };
  options0!: EChartsOption;
  updateOptions0!: EChartsOption;
  loading = true;

  private data!: DataT[];

  ngOnInit(): void {
    // initialize chart
    this.data = [];
    this.options0 = {
      title: {
        text: 'Prix de Lyxor MSCI World - EWLD',
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
          name: 'EWLD',
          type: 'line',
          showSymbol: false,
          data: this.data,
        },
      ],
    };

    this.httpClient
      .get(
        'assets/Historique des VLs_Lyxor PEA Monde (MSCI World) UCITS ETF - Capi._FR0011869353_13_05_2014.xlsx',
        // 'assets/Historique de performance_Lyxor MSCI World UCITS ETF - Dist_FR0010315770_27_07_2023.xlsx',
        // 'assets/Historique des VLs_Amundi MSCI World UCITS ETF - EUR (C)_LU1681043599_18_04_2018.xlsx',
        { responseType: 'blob' }
      )
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
        this.loading = false;
        this.updateOptions0 = {
          series: [
            {
              data: data,
            },
          ],
        };
      });
  }

  // Example

  options1: EChartsOption = {
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

  mergeOptions1!: EChartsOption;

  RandomDataset() {
    this.mergeOptions1 = {
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
        const currentCell = content[utils.encode_cell({ c, r })];
        if (currentCell?.w === 'VL officielle') {
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
        const value = `${split[2]}/${split[1]}/${split[0]}`;
        this.data.push(
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
