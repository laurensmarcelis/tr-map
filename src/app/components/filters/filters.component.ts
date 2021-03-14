import { Component, forwardRef, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, FormArray, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-filters',
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => FiltersComponent),
    },
  ],
})
export class FiltersComponent implements OnInit, ControlValueAccessor {
  @Input() filters;
  open = false;
  constructor() { }
  form = new FormArray([]);
  ngOnInit() {
    this.filters.forEach((item) => {
      this.form.push(new FormControl(false));
    });

    this.form.valueChanges.subscribe((val) => {
      let returnVal = this.filters.map((_val) => _val.name).filter((_val, i) => val[i] && _val);;

      this.onChange(returnVal);
    });
  }
  onTouched: () => void;
  onChange: (value: string[]) => void;

  writeValue(obj: any): void {}

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  clear() {
    this.form.reset();
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

}
