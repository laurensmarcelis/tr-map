import {
  Component,
  NgZone,
  AfterViewInit,
  Output,
  Input,
  EventEmitter,
  ChangeDetectorRef,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { View, Feature, Map, Overlay } from "ol";
import { createStringXY } from "ol/coordinate";
import ImageLayer from "ol/layer/Image";
import Static from "ol/source/ImageStatic";
import Icon from "ol/style/Icon";
import {
  ScaleLine,
  defaults as DefaultControls,
  MousePosition,
} from "ol/control";
import VectorLayer from "ol/layer/Vector";
import Projection from "ol/proj/Projection";
import { Extent, getCenter } from "ol/extent";
import VectorSource from "ol/source/Vector";
import Cluster from 'ol/source/Cluster';
import Point from "ol/geom/Point";
import Select from "ol/interaction/Select";
import { Style, Fill, Circle, Stroke } from "ol/style";
import OverlayPositioning from "ol/OverlayPositioning";
import { pointerMove } from "ol/events/condition";
import { FormControl, FormGroup } from '@angular/forms';
import { MapApiService } from "../../service/map-api.service";
import { forkJoin, Subject } from "rxjs";

@Component({
  selector: "app-map",
  templateUrl: "./map.component.html",
  styleUrls: ["./map.component.scss"],
})
export class MapComponent implements OnInit {
  @ViewChild("location", { static: true }) location: ElementRef;
  @ViewChild("popup", { static: true }) popup: ElementRef;
  view: View;
  zoom = 4;
  x = 263;
  y = 660;
  s = 1;
  clusterIgnore = ['npc','shop','workbench','anvil','bank','campfire']
  filters: string[];
  fullImagePath = "./assets/tr-map.png";
  features: Feature[] = [];
  mobs: Feature[] = [];
  npc: Feature[] = [];
  interactables: Feature[] = [];
  projection: Projection;
  extent: Extent = [0, 0, 2048, 2048];
  Map: Map;
  mobLayer: VectorLayer;
  interLayer: VectorLayer;
  npcLayer: VectorLayer;
  filterLayer: VectorLayer;
  mapLayer: ImageLayer;
  popupOverlay: Overlay;
  activeFeature;

  form = new FormGroup({
    filters: new FormControl(),
  });

  @Output() mapReady = new EventEmitter<Map>();
  constructor(
    private http: HttpClient,
    private mapService: MapApiService
  ) { }

  ngOnInit() {
    const preFilter = []
    this.popupOverlay = new Overlay({
      element: this.popup.nativeElement,
      positioning: OverlayPositioning.BOTTOM_CENTER,
      offset: [0, -25],
    });

    const allPoints = forkJoin([
      this.mapService.getMobs(),
      this.mapService.getInteractables(),
      this.mapService.getNPCs(),
    ])
    
    allPoints.subscribe({
      next : ([mobs,interactables,friendlies]: any) => {
        this.mobs = this.createFeatures(mobs.data)
        this.npc = this.createFeatures(friendlies.data)
        this.interactables = this.createFeatures(interactables.data)
        this.features = this.interactables.concat(this.mobs, this.npc);
        this.filters = [...mobs.data,...interactables.data, ...friendlies.data];
        console.log(this.mobs);
        this.initMap();
      },
      error: (err) => {
        console.log(err);
      }
    })
    this.form.valueChanges.subscribe(form => {
      this.setFilters(form.filters)
    })
  }

  private createFeatures(points:TRFeature[] ) {
    console.log(points);
    const features = [];
    points.forEach((point: TRFeature) => {
      point.pos.forEach(position => {
        const stylePoint = {
          pos: [(position[0]) + 1024, position[1]],
          name: point.icon,
          color: point.color,
        }
        const feat = new Feature({
          geometry: new Point([(position[0]) + 1024, position[1]]),
          name: point.name,
          icon: point.icon,
          title: point.title,
          description: point.description,
          level: point.level,
          drops: point.drops ? this.createDrops(point.totalweight, point.drops) : null,
          color: point.color,
          items: point.items
        });
        feat.set("style", this.createStyle(stylePoint));
        features.push(feat);
      })
    });
    return features;
  }


  private createStyle(src: TRStyle, radius = 20, opacity = 0.8) {
    const icon = new Style({
      image: new Icon({
        src: `./assets/icons/${src.name}.svg`,
        color: colorMap[src.color],
        scale: 0.3,
      }),
    });
    const circle = new Style({
      image: new Circle({
        fill: new Fill({
          color: `rgba(225,225,225,${opacity})`,
        }),

        stroke: new Stroke({
          color: "#333",
          width: 2,
        }),
        radius: radius,
      }),
    });
    return [circle, icon];
  }

  private initMap(): void {
    
    this.projection = new Projection({

      code: "tr-map",
      units: "pixels",
    });

    const clusterMobSource = new Cluster({
      distance: 18,
      source: new VectorSource({ features: this.mobs }),
    });

    const friendlySource = new VectorSource({ features: this.npc });
    const clusterInterSource = new Cluster({
      distance: 18,
      source: new VectorSource({ features: this.interactables }),
    });
    const styleCache = {};

    this.mobLayer = new VectorLayer({
      style: (feat: Feature) => {
        var size = feat.get('features')[0].get('name');
        var style = styleCache[size];
        const point: Point = <Point>feat.getGeometry();
        const coord: number[] = point.getCoordinates();
        const stylePoint = {
          name: feat.get('features')[0].get('icon'),
          color:feat.get('features')[0].get('color'),
          pos: coord
        }
        if (!style) {
          style = this.createStyle(stylePoint);
        }
        styleCache[size] = style;
        return style;
      },
      source: clusterMobSource,//new VectorSource({ features: this.features }),
    }),

    this.interLayer = new VectorLayer({
      style: (feat: Feature) => {
        var size = feat.get('features')[0].get('name');
        var style = styleCache[size];
        const point: Point = <Point>feat.getGeometry();
        const coord: number[] = point.getCoordinates();
        const stylePoint = {
          name: feat.get('features')[0].get('icon'),
          color:feat.get('features')[0].get('color'),
          pos: coord
        }
        if (!style) {
          style = this.createStyle(stylePoint);
        }
        styleCache[size] = style;
        return style;
      },
      source: clusterInterSource,//new VectorSource({ features: this.features }),
    }),

      this.filterLayer = new VectorLayer({
        visible: false,
        style: (feat) => {
          return feat.get("style");
        },
        source: new VectorSource({ features: [] }),
      }),
      this.npcLayer = new VectorLayer({
        style: (feat) => {
          return feat.get("style");
        },
        source: friendlySource
      }),
      this.mapLayer = new ImageLayer({
        source: new Static({
          url: this.fullImagePath,
          projection: this.projection,
          imageExtent: [260, 660, 1166.66, 1177.8600000000001],
        }),
      }),

      this.projection.setExtent(this.extent);
    this.view = new View({
      center: [683, 950], //getCenter(this.extent),
      zoom: this.zoom,
      maxZoom: 8,
      minZoom: 0,
      extent: this.extent,
      projection: this.projection,
    });
    this.Map = new Map({
      layers: [
        this.mapLayer,
        this.mobLayer,
        this.npcLayer,
        this.interLayer,
        this.filterLayer,
      ],
      target: "map",
      view: this.view,
      overlays: [this.popupOverlay],
      controls: DefaultControls().extend([
        new ScaleLine({}),
        new MousePosition({
          coordinateFormat: createStringXY(0),
          projection: this.projection,
          target: this.location.nativeElement,
        }),
      ]),
    });
    let selected = null;
    this.Map.on("pointermove", (e) => {

      const coord = e.coordinate;
      if (this.Map.getFeaturesAtPixel(e.pixel).length === 0) {
        this.popupOverlay.setPosition(undefined);
      }
      this.Map.forEachFeatureAtPixel(e.pixel, (f) => {
        if (f.get('features') && f.get('features').length > 0) {
          f = f.get('features')[0]
        }
        const point: Point = <Point>f.getGeometry();
        const coord = point.getCoordinates();

        this.activeFeature = { ...f.getProperties() };

        this.popupOverlay.setPosition(coord);
      });
    });
    this.Map.on("singleclick", function (evt) {
      var coordinate = evt.coordinate;
      console.log(coordinate.toString());
    });

    this.Map.addInteraction(this.selected_feature);
  }


  setFilters(filters) {
    if (filters.length == 0) {
      this.filterLayer.setVisible(false);
      this.mobLayer.setVisible(true);
      this.interLayer.setVisible(true);
      this.npcLayer.setVisible(true);
      return
    }
    const test = this.features.filter(feature => {
      return filters.includes(feature.get('name'))
    })
    this.filterLayer.setSource(new VectorSource({ features: test }))
    this.filterLayer.setVisible(true);
    this.mobLayer.setVisible(false);
    this.interLayer.setVisible(false);
    this.npcLayer.setVisible(false);
  }

  selected_feature = new Select({
    condition: pointerMove,
    style: (feat) => {
      if (feat.get('features') && feat.get('features').length > 0) {
        feat = feat.get('features')[0]
      }
      const point: Point = <Point>feat.getGeometry();
      const coord: number[] = point.getCoordinates();
      const name: string = <string>feat.get("icon");
      const color: string = <string>feat.get("color");
      return this.createStyle({ pos: coord, name, color }, 20, 1);
    },
  });

  createDrops(totalWeight, drops: Drop[]) {

    return drops.map(drop => {
      const numbers = this.reduce(drop.weight, totalWeight)
      const chance = (isNaN(numbers[0]) || numbers[0] == 0) ? "always" : `${numbers[0]} / ${numbers[1]}`
      return { ...drop, chance };
    })
  }
  private reduce(numerator: number, denominator: number) {
    let gcd: any = function gcd(a, b) {
      return b ? gcd(b, a % b) : a;
    };
    gcd = gcd(numerator, denominator);
    return [numerator / gcd, denominator / gcd];
  }

  // slide(type, event) {
  //   switch (type) {
  //     case 'x': this.x = parseInt(event.target.value);
  //       break;
  //     case 'y': this.y = parseInt(event.target.value);
  //       break;
  //     case 's': this.s = parseFloat(event.target.value);
  //   }
  //   this.mapLayer.setSource(new Static({
  //     url: this.fullImagePath,
  //     projection: this.projection,
  //     imageExtent: [this.x, this.y, ((1679 * this.s) + this.x), ((959 * this.s) + this.y)],
  //   }))
  // }

}

export interface TRFeature {
  pos: [number[]];
  name: string;
  icon?: string;
  level?: string;
  drops?: Drop[];
  title?: string;
  color?: string;
  description: string;
  info: string
  items: any[];
  health: number;
  totalweight? : number;
}

export interface Drop {
  name: string;
  amount: string;
  weight: number;
  chance?: string;
}
export interface TRStyle {
  pos: number[];
  name: string;
  color?: string;
}

const colorMap = {
  'red': "#c0392b",
  'yellow': "#f1c40f",
  'brown': "#cd6133",
  'coal': "#2c3e50",
  'iron': "#e74c3c",
  'copper': "#e67e22",
  'purple': "#9b59b6",
  'blue': "#2980b9"
}