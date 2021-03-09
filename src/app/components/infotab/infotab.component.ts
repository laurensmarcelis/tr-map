import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-infotab',
  templateUrl: './infotab.component.html',
  styleUrls: ['./infotab.component.scss']
})
export class InfotabComponent implements OnInit {
  open =false;
  list = [{
    name: "Apple",
    amount: 20
  },
  {
    name: "Chicken",
    amount: 40
  },
  {
    name: "Carp",
    amount: 40
  },
  {
    name: "Perch",
    amount: 60
  },
  {
    name: "Ham",
    amount: 60
  },
  {
    name: "Steak",
    amount: 60
  },
  {
    name: "Wolf Meat",
    amount: 80
  },
  {
    name: "Prawn",
    amount: 80
  },
  {
    name: "Hagnesh",
    amount: 100
  },
  {
    name: "Yabbie",
    amount: 120
  },
  {
    name: "Potatoe",
    amount: 500
  }];
  constructor() { }

  ngOnInit() {
  }

}
