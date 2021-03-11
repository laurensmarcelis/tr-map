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
import Point from "ol/geom/Point";
import Select from "ol/interaction/Select";
import { Style, Fill, Circle, Stroke } from "ol/style";
import OverlayPositioning from "ol/OverlayPositioning";
import { pointerMove } from "ol/events/condition";
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: "app-map",
  templateUrl: "./map.component.html",
  styleUrls: ["./map.component.scss"],
})
export class MapComponent implements OnInit {
  @ViewChild("location", { static: true }) location: ElementRef;
  @ViewChild("popup", { static: true }) popup: ElementRef;
  view: View;
  zoom = 3;
  x = 200;
  y = 500;
  s = 1;
  filters: string[];
  fullImagePath = "./assets/tr-map.png";
  features: Feature[] = [];
  projection: Projection;
  extent: Extent = [0, 0, 2048, 2048];
  Map: Map;
  pointsLayer: VectorLayer;
  filterLayer: VectorLayer;
  mapLayer: ImageLayer;
  popupOverlay: Overlay;
  activeFeature;
  form = new FormGroup({
    filters: new FormControl(),
  });
  @Output() mapReady = new EventEmitter<Map>();
  constructor(
    private zone: NgZone,
    private cd: ChangeDetectorRef,
    private http: HttpClient
  ) { }

  ngOnInit() {
    const preFilter = []
    this.popupOverlay = new Overlay({
      element: this.popup.nativeElement,
      positioning: OverlayPositioning.BOTTOM_CENTER,
      offset: [0, -25],
    });

    this.form.valueChanges.subscribe(form => {
      this.setFilters(form.filters)
    })
    this.http.get("./assets/points.json").subscribe((points: TRFeature[]) => {
      points.forEach((point: TRFeature) => {
        preFilter.push(point.name)
        point.pos.forEach(position => {
          const stylePoint  = {
            pos: [(position[0]  ) + 1024, position[1]  ],
            name: point.name,
            color: point.color,
          }
          const feat = new Feature({
            geometry: new Point([(position[0]  ) + 1024, position[1]  ]),
            name: point.name,
            description: point.description,
            level: point.level,
            drops: point.drops ? this.createDrops(point.drops): null,
            color: point.color,
            info: point.info,
          });
          feat.set("style", this.createStyle(stylePoint));
          this.features.push(feat);
        })
      });

      this.filters = [...new Set(preFilter)];
      this.initMap();
    });
  }

  

  private createStyle(src: TRStyle, radius = 20, opacity = 0.7) {
    // const icon = new Style({
    //   image: new Icon({
    //     src: `./assets/icons/${src.name}.svg`,
    //     color: src.color ? src.color : "black",
    //     scale: 0.3,
    //   }),
    // });
    const circle = new Style({
      image: new Circle({
        fill: new Fill({
          color: `rgba(255,255,255,${opacity})`,
        }),
        
        stroke: new Stroke({
          color: "#000",
          width: 1.25,
        }),
        radius: radius,
      }),
    });
    return [circle];
  }

  private initMap(): void {
    this.projection = new Projection({

      code: "tr-map",
      units: "pixels",
    });
    this.pointsLayer = new VectorLayer({
      style: (feat) => {
        return feat.get("style");
      },
      source: new VectorSource({ features: this.features }),
    }),

    this.filterLayer = new VectorLayer({
      visible: false,
      style: (feat) => {
        return feat.get("style");
      },
      source: new VectorSource({ features: [] }),
    }), 

    this.mapLayer = new ImageLayer({
      source: new Static({
        url: this.fullImagePath,
        projection: this.projection,
        imageExtent: [263, 660, 1169.66, 1177.8600000000001],
      }),
    }),

    this.projection.setExtent(this.extent);
    this.view = new View({
      center: getCenter(this.extent),
      zoom: this.zoom,
      maxZoom: 10,
      minZoom: 0,
      extent: this.extent,
      projection: this.projection,
    });
    this.Map = new Map({
      layers: [
        this.mapLayer,
        this.pointsLayer,
        this.filterLayer,
      ],
      target: "map",
      view: this.view,
      overlays: [this.popupOverlay],
      controls: DefaultControls().extend([
        new ScaleLine({}),
        new MousePosition({
          coordinateFormat:createStringXY(0),
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
      this.Map.forEachFeatureAtPixel(e.pixel, (f: Feature) => {
        const point: Point = <Point>f.getGeometry();
        const coord = point.getCoordinates();
        
        this.activeFeature = {...f.getProperties()};

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
    if(filters.length == 0) {
      this.filterLayer.setVisible(false);
      this.pointsLayer.setVisible(true);
      return
    }
    const test = this.features.filter(feature => {
      return filters.includes(feature.get('name'))
    })
    this.filterLayer.setSource(new VectorSource({features: test}))
    this.filterLayer.setVisible(true);
    this.pointsLayer.setVisible(false);
  }
  selected_feature = new Select({
    condition: pointerMove,
    style: (feat) => {
      const point: Point = <Point>feat.getGeometry();
      const coord: number[] = point.getCoordinates();
      const name: string = <string>feat.get("name");
      const color: string = <string>feat.get("color");
      return this.createStyle({ pos: coord, name, color }, 20, 1);
    },
  });

  createDrops(drops: Drop[]) {
    const totalweight = drops ? drops.reduce((a, b):any => a +( b.weight || 0), 0) : 0;
    
    return drops.map(drop => {
      const numbers = this.reduce(drop.weight  ,totalweight)
      const chance = (isNaN(numbers[0]))? "always" :`${numbers[0]} / ${numbers[1]}`
      return {...drop,chance};
    })
  }
  private reduce(numerator: number,denominator:number){
    let gcd:any = function gcd(a,b){
      return b ? gcd(b, a%b) : a;
    };
    gcd = gcd(numerator,denominator);
    return [numerator/gcd, denominator/gcd];
  }

  // slide(type, event) {
  //   console.log(event)
  //   switch(type) {
  //     case 'x': this.x = parseInt(event.target.value);
  //     break;
  //     case 'y': this.y = parseInt(event.target.value);
  //     break;
  //     case 's': this.s = parseFloat(event.target.value);
  //   }
  //   console.log(type);
  //   console.log(<number>this.x);
  //   console.log(<number>this.y);
  //   console.log([this.x,this.y , ((1679*this.s) + this.x),(( 959*this.s) + this.y)])
  //   this.mapLayer.setSource(new Static({
  //     url: this.fullImagePath,
  //     projection: this.projection,
  //     imageExtent: [this.x,this.y ,( (1679*this.s) + this.x),(( 959*this.s) + this.y)],
  //   }),)
  //  }
  
}

export interface TRFeature {
  pos: [number[]];
  name: string;
  icon?: string;
  level?: string;
  drops?: Drop[];
  color?: string;
  description: string;
  info: string
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
