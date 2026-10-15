declare module '@lhncbc/ucum-lhc' {
  export interface ConvertResult {
    status: 'succeeded' | 'failed' | 'error';
    toVal: number | null;
    msg: string[];
  }
  export interface ValidateResult {
    status: 'valid' | 'invalid' | 'error';
    ucumCode: string | null;
    msg: string[];
    unit?: { code: string; name: string };
  }
  export class UcumLhcUtils {
    static getInstance(): UcumLhcUtils;
    convertUnitTo(
      from: string,
      value: number,
      to: string,
      options?: { suggest?: boolean; molecularWeight?: number | null; charge?: number | null },
    ): ConvertResult;
    validateUnitString(unit: string, suggest?: boolean): ValidateResult;
  }
  const pkg: { UcumLhcUtils: typeof UcumLhcUtils };
  export default pkg;
}
