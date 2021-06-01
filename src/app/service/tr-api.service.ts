import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TrApiService {
  baseUrl = 'https://api.titanreach.com'
  constructor(
    private http: HttpClient
  ) { }

  getWorlds() {
    return this.http.get<any>(`${this.baseUrl}/game/worlds`).pipe(map(result => result.results))
  }
}
