import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapApiService {
  baseUrl = 'https://api.tr-map.com';
  constructor(
    private http: HttpClient
  ) { }
    test() {
      return this.http.get(`${this.baseUrl}/auth`)
    }
  getNPCs() { 
    return this.http.get(`${this.baseUrl}/npc/friendly`)
  }
  getInteractables() {
    return this.http.get(`${this.baseUrl}/interactables`)
  }
  getMobs() {
    return this.http.get(`${this.baseUrl}/npc/mobs`)
  }

  getMaps() {
    return this.http.get(`${this.baseUrl}/lands`)
  }

  getTempImg(baseImage) {
    return this.http.post(`${this.baseUrl}/tempImg`, {params: {baseImage}})
  }
}
