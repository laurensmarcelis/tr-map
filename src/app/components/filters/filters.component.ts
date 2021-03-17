import { AfterContentInit, Component, forwardRef, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, FormArray, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

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
export class FiltersComponent implements OnInit, ControlValueAccessor, AfterContentInit {
  @Input() filters;
  open = false;
  filter = null;
  onTouched: () => void;
  onChange: (value: string[]) => void;
  constructor(
    private route: ActivatedRoute
  ) { }
  ngAfterContentInit(): void {
    if(this.filter) {
      const ret = this.filters.findIndex(x => x.name === this.filter);
      this.form.get(String(ret)).setValue(true);
    };
  }
  form = new FormArray([]);
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params.filter) {
        this.filter = params.filter;
      }
    });
    this.filters.forEach((item) => {
      this.form.push(new FormControl(false));
    });

   
    this.form.valueChanges.subscribe((val) => {
      let returnVal = this.filters.map((_val) => _val.name).filter((_val, i) => val[i] && _val);;

      this.onChange(returnVal);
    });

    
  }
 

  writeValue(obj: any): void { }

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
