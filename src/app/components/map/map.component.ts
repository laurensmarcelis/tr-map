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

@Component({
  selector: "app-map",
  templateUrl: "./map.component.html",
  styleUrls: ["./map.component.scss"],
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild("location", { static: true }) location: ElementRef;
  @ViewChild("popup", { static: true }) popup: ElementRef;
  view: View;
  center = [0, 0];
  zoom = 3;
  fullImagePath = "./assets/tr-map.png";
  features: Feature[] = [];
  projection: Projection;
  extent: Extent = [0, 0, 1679, 959];
  Map: Map;
  popupOverlay: Overlay;
  @Output() mapReady = new EventEmitter<Map>();
  constructor(
    private zone: NgZone,
    private cd: ChangeDetectorRef,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.popupOverlay = new Overlay({
      element: this.popup.nativeElement,
      positioning: OverlayPositioning.BOTTOM_CENTER,
      offset: [0, -25],
    });
    this.http.get("./assets/points-new.json").subscribe((points: TRFeature[]) => {
      points.forEach((point: TRFeature) => {
        point.pos.forEach(position => {
          const stylePoint  = {
            pos: position,
            name: point.name,
            color: point.color,
          }
          const feat = new Feature({
            geometry: new Point(position),
            name: point.name,
            description: point.description,
            level: point.level,
            drops: point.drops,
            color: point.color,
          });
          feat.set("style", this.createStyle(stylePoint));
          this.features.push(feat);
        })
      });
      this.initMap();
    });
  }

  private createStyle(src: TRStyle, radius = 20, opacity = 0.7) {
    const icon = new Style({
      image: new Icon({
        src: `./assets/icons/${src.name}.svg`,
        color: src.color ? src.color : "black",
        scale: 0.3,
      }),
    });
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
    return [circle,icon];
  }

  ngAfterViewInit(): void {
    //setTimeout(()=>this.mapReady.emit(this.Map));
  }

  private initMap(): void {
    this.projection = new Projection({
      code: "tr-map",
      units: "pixels",
    });
    this.projection.setExtent(this.extent);
    this.view = new View({
      center: getCenter(this.extent),
      zoom: this.zoom,
      maxZoom: 5,
      minZoom: 0,
      extent: this.extent,
      projection: this.projection,
    });
    this.Map = new Map({
      layers: [
        new ImageLayer({
          source: new Static({
            url: this.fullImagePath,
            projection: this.projection,
            imageExtent: this.extent,
          }),
        }),
        new VectorLayer({
          style: (feat) => {
            return feat.get("style");
          },
          source: new VectorSource({ features: this.features }),
        }),
      ],
      target: "map",
      view: this.view,
      overlays: [this.popupOverlay],
      controls: DefaultControls().extend([
        new ScaleLine({}),
        new MousePosition({
          coordinateFormat: createStringXY(1),
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
        let message = `
        <b>${f.get("description")}</b><br/>
        <b>level:</b> ${f.get("level")}<br/>`;
        if (f.get("drops")) {
          message = message + `<b>drops:</b> ${f.get("drops")}<br/>`;
        }

        this.popup.nativeElement.innerHTML = message;

        this.popupOverlay.getElement;
        this.popupOverlay.setPosition(coord);
      });
    });
    this.Map.on("singleclick", function (evt) {
      var coordinate = evt.coordinate;
      console.log(coordinate.toString());
    });

    this.Map.addInteraction(this.selected_feature);
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
}

export interface TRFeature {
  pos: [number[]];
  name: string;
  icon?: string;
  level?: string;
  drops?: string;
  color?: string;
  description: string;
}

export interface TRStyle {
  pos: number[];
  name: string;
  color?: string;
}
