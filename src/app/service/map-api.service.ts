import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapApiService {
  baseUrl = 'http://localhost:8050'
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
}
