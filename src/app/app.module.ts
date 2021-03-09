import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MapComponent } from './components/map/map.component';
import { HttpClientModule } from '@angular/common/http';
import { FiltersComponent } from './components/filters/filters.component';
import { ReactiveFormsModule } from '@angular/forms';
import { InfotabComponent } from './components/infotab/infotab.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    FiltersComponent,
    InfotabComponent,
    
  ],
  imports: [
    HttpClientModule, 
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
