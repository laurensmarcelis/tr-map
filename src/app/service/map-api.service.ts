import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapApiService {
  baseUrl = 'https://api.tr-map.com'
  constructor(
    private http: HttpClient
  ) { }

  getNPCs() { 
    return this.http.get(`${this.baseUrl}/npc/friendly`)
  }
  getInteractables() {
    return this.http.get(`${this.baseUrl}/interactables`)
  }
  getMobs() {
    return this.http.get(`${this.baseUrl}/npc/mobs`)
  }

  getHiScore() {
    let body = new URLSearchParams();
    body.set('username', "kareldegrote");
    let headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    return this.http.post('https://titanreach.com/ajax/skills-by-player', body, {headers})
  }
}
