import {Component, NgZone, AfterViewInit, Output, Input, EventEmitter, ChangeDetectorRef, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {View, Feature, Map, Overlay } from 'ol';
import Select from 'ol/interaction/Select';
import {Coordinate, createStringXY} from 'ol/coordinate';
import ImageLayer from 'ol/layer/Image';
import Static from 'ol/source/ImageStatic';
import Icon from 'ol/style/Icon';
import { ScaleLine, defaults as DefaultControls, MousePosition} from 'ol/control';
import VectorLayer from 'ol/layer/Vector';
import Projection from 'ol/proj/Projection';
import {register}  from 'ol/proj/proj4';
import {get as GetProjection} from 'ol/proj'
import {coordinateRelationship, Extent, getCenter} from 'ol/extent';
import TileLayer from 'ol/layer/Tile';
import OSM, {ATTRIBUTION} from 'ol/source/OSM';
import proj4 from 'proj4';
import VectorSource from 'ol/source/Vector';
import Point from 'ol/geom/Point';
import {Style, Text, Fill, Circle, Stroke} from 'ol/style';
import IconAnchorUnits from 'ol/style/IconAnchorUnits';
import { element } from 'protractor';
// import Text from 'ol/style/Text';
// import Fill from 'ol/style/Fill';
// import Circle from 'ol/Style/Circle';
// import Stroke from 'ol/style/Stroke';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild('location', {static: true}) location: ElementRef;
  @ViewChild('popup', {static: true}) popup: ElementRef;
  view: View;
  center = [0,0];
  zoom = 3;
  fullImagePath = './assets/tr-map.png';
  features: Feature[] = [];
  projection: Projection;
  extent: Extent = [0, 0, 1679, 959];
  Map: Map;
  highlightStyle = new Style({
    fill: new Fill({
      color: 'rgba(255,255,255,0.7)',
    }),
    stroke: new Stroke({
      color: '#3399CC',
      width: 3,
    }),
  });
  popupOverlay: Overlay;
  @Output() mapReady = new EventEmitter<Map>();
  constructor(private zone: NgZone, private cd: ChangeDetectorRef, private http: HttpClient) { }

  ngOnInit() {
    this.popupOverlay = new Overlay({
      element: this.popup.nativeElement,
      offset: [-20, -70]
    })
    this.http.get('./assets/points.json').subscribe((points: point[]) => {
      points.forEach(point => {
        const feat = new Feature({
          geometry: new Point(point.pos),
          name: point.name
        });
        feat.set('style',this.createStyle(point.icon))
        this.features.push(feat);
      })
      setTimeout(() => {
        this.initMap();
      },2000)
      
    })
 
  }

  private createStyle(src) {
    return new Style({
      text: new Text({
        text: '\uf024', // fas flag solid
        scale: 1,
        font: 'normal 18px FontAwesome',
      }),
      image: new Circle({
        fill: new Fill({
          color: 'rgba(255,255,255,1)'
        }),
        stroke: new Stroke({
          color: '#000',
          width: 1.25
        }),
        radius: 20
      }),
      
    });
  }

  ngAfterViewInit():void {
    
    //setTimeout(()=>this.mapReady.emit(this.Map));
  }

  private initMap(): void{
    proj4.defs("EPSG:3857","+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs");
    register(proj4)
    this.projection = new Projection({
      code: 'tr-map',
      units: 'pixels',
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
          return feat.get('style')
        },
        source: new VectorSource({features: this.features})
      })
      ],
      target: 'map',
      view: this.view,
      overlays: [this.popupOverlay],
      controls: DefaultControls().extend([
        new ScaleLine({}),
        new MousePosition({
          coordinateFormat: createStringXY(1),
          projection: this.projection,
          target: this.location.nativeElement
        })
      ]),
    });
    let selected = null;
    this.Map.on('pointermove', (e) => {
      const coord = e.coordinate;
      if(this.Map.getFeaturesAtPixel(e.pixel).length === 0) {
        this.popupOverlay.setPosition(undefined);
      }
      this.Map.forEachFeatureAtPixel(e.pixel, (f: Feature) => {

        const point: Point = <Point>f.getGeometry();
        const coord = point.getCoordinates();
        this.popup.nativeElement.innerHTML = f.get('name');
        this.popupOverlay.setPosition(coord)
      })
    })
  }
}

export interface point {
  pos: [number, number],
  name: string,
  icon: string
}
