import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TrApiService } from 'src/app/service/tr-api.service';

@Component({
  selector: 'app-world-status',
  templateUrl: './world-status.component.html',
  styleUrls: ['./world-status.component.scss']
})
export class WorldStatusComponent implements OnInit {
  servers$: Observable<any>;
  constructor(
    private trApi: TrApiService
  ) { }

  ngOnInit() {

    this.servers$ = this.trApi.getWorlds();
  }

  getPop(server) {
    const pop = Math.round((server.worldOnlinePlayers /server.worldMaxPlayers) * 100)
    if(pop < 25) {
      return "low"
    }

    if(pop < 50) {
      return "medium"
    }

    if(pop < 75) {
      return "high"
    }

    if(pop < 100) {
      return "full"
    }
  }

}
