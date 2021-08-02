import {
  AfterContentInit,
  Component,
  forwardRef,
  Input,
  OnInit,
  SimpleChanges,
} from "@angular/core";
import {
  ControlValueAccessor,
  FormArray,
  FormControl,
  NG_VALUE_ACCESSOR,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
  selector: "app-filters",
  templateUrl: "./filters.component.html",
  styleUrls: ["./filters.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => FiltersComponent),
    },
  ],
})
export class FiltersComponent
  implements OnInit, ControlValueAccessor, AfterContentInit {
  @Input() filters;
  open = false;
  filter = null;
  onTouched: () => void;
  form = new FormArray([]);
  onChange: (value: string[]) => void;
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngAfterContentInit(): void {
    if (this.filter) {
      this.filter.forEach(element => {
        const ret = this.filters.findIndex((x) => x.name === element);
        this.form.get(String(ret)).setValue(true);
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.filters.isFirstChange()) {
      this.form.controls = [];
      this.populateForm(changes.filters.currentValue);
    }
    // You can also use categoryId.previousValue and
    // categoryId.firstChange for comparing old and new values
  }

  populateForm(filters) {
    filters.forEach((item) => {
      this.form.push(new FormControl(false));
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params.filter) {
        this.filter = Array.isArray(params.filter) ? params.filter : [params.filter];
      }
    });

    this.populateForm(this.filters);
    this.form.valueChanges.subscribe((val) => {
      let returnVal = this.filters
        .map((_val) => _val.name)
        .filter((_val, i) => val[i] && _val);

      this.onChange(returnVal);
      this.setQueryParams(returnVal);
    });
  }


  setQueryParams(returnVal) {
      this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        filter: returnVal
      },
      queryParamsHandling: 'merge'
    });
  }

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
