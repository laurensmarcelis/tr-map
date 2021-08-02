import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  AfterContentInit,
} from "@angular/core";
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
import { Extent } from "ol/extent";
import VectorSource from "ol/source/Vector";
import Cluster from "ol/source/Cluster";
import Point from "ol/geom/Point";
import Select from "ol/interaction/Select";
import { Style, Fill, Circle, Stroke } from "ol/style";
import OverlayPositioning from "ol/OverlayPositioning";
import { pointerMove } from "ol/events/condition";
import { FormControl, FormGroup } from "@angular/forms";
import { MapApiService } from "../../service/map-api.service";
import { BehaviorSubject, forkJoin, of } from "rxjs";
import LayerGroup from "ol/layer/Group";
import { ActivatedRoute, Router } from "@angular/router";
import html2canvas from "html2canvas";
import { Meta } from "@angular/platform-browser";

@Component({
  selector: "app-map",
  templateUrl: "./map.component.html",
  styleUrls: ["./map.component.scss"],
})
export class MapComponent implements OnInit, AfterContentInit {
  @ViewChild("location", { static: true }) location: ElementRef;
  @ViewChild("popup", { static: true }) popup: ElementRef;
  @ViewChild("map", { static: true }) map: ElementRef;
  @ViewChild("sneaky", { static: true }) sneaky: ElementRef;
  view: View;
  zoom = 4;
  x = 263;
  y = 660;
  s = 1;
  maps;
  loading$ = new BehaviorSubject<boolean>(true);
  clusterIgnore = ["npc", "shop", "workbench", "anvil", "bank", "campfire"];
  filters: string[];
  returnMain = false;
  fullImagePath = "./assets/";
  features: Feature[] = [];
  projection: Projection;
  extent: Extent = [0, 0, 2048, 2048];
  Map: Map;
  mapLayer: ImageLayer;
  popupOverlay: Overlay;
  activeFeature;
  activeMap = 0;
  activeParams;
  form = new FormGroup({
    filters: new FormControl(),
  });

  private cx: CanvasRenderingContext2D;

  @Output() mapReady = new EventEmitter<Map>();
  constructor(
    private mapService: MapApiService,
    private router: Router,
    private route: ActivatedRoute,
    private meta: Meta
  ) { }

  ngAfterContentInit(): void {
    this.form.valueChanges.subscribe((form) => {
      this.setFilters(form.filters);
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.activeParams = params;
      if (params.map) {
        this.activeMap = params.map
        if (this.maps) {
          this.setActiveGroup(this.activeMap);
        }
      }
    });

    this.popupOverlay = new Overlay({
      element: this.popup.nativeElement,
      positioning: OverlayPositioning.BOTTOM_CENTER,
      offset: [0, -25],
    });
    //this.mapService.test().subscribe(val => console.log(val));

    const allPoints = forkJoin([
      this.mapService.getMaps(),
      this.mapService.getMobs(),
      this.mapService.getInteractables(),
      this.mapService.getNPCs(),
    ]);

    allPoints.subscribe({
      next: ([maps, mobs, interactables, friendlies]: any) => {
        this.maps = maps.data;
        this.maps.forEach((map, index) => {
          const _mobs = mobs.data.filter((item) => item.map == index);
          const _interactables = interactables.data.filter(
            (item) => item.map == index
          );
          const _npc = friendlies.data.filter((item) => item.map == index);

          map.mobs = this.createFeatures(
            _mobs,
            2048 / map.MapRes,
            (map.MapRes + map.MapRes / 2) / 2048,
            map.MapRes / 2048,
            index === 1
          );
          map.interactables = this.createFeatures(
            _interactables,
            2048 / map.MapRes,
            (map.MapRes + map.MapRes / 2) / 2048,
            map.MapRes / 2048,
            index === 1
          );
          map.npc = this.createFeatures(
            _npc,
            2048 / map.MapRes,
            (map.MapRes + map.MapRes / 2) / 2048,
            map.MapRes / 2048,
            index === 1
          );
          map.filters = [..._mobs, ..._interactables, ..._npc];
          map.features = map.interactables.concat(map.mobs, map.npc);
        });
        this.filters = this.maps[0].filters;
        this.initMap();
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  private createFeatures(
    points: TRFeature[],
    resize = 1,
    scalingX = 0.75,
    scalingY = 0.5,
    revert = false
  ) {
    const features = [];
    points.forEach((point: TRFeature) => {
      point.pos.forEach((position) => {
        let p = [
          position[0] + 1024,
          position[1],
        ];
        if (revert) {
          p = [
            ((2048 - 512) - position[0] * 3) + 0 * scalingX,
            (2048 - position[1] * 3) - 1024 * scalingY,
          ]

        }
        const stylePoint = {
          pos: p,
          name: point.icon,
          color: point.color,
        };
        const feat = new Feature({
          geometry: new Point(p),
          ...point,
          drops: point.drops
            ? this.createDrops(point.totalweight, point.drops)
            : null,
        });
        feat.set("style", this.createStyle(stylePoint));
        features.push(feat);
      });
    });

    return features;
  }

  rotatePoint(posX = 1024, posY = 1024, angle, point) {
    const s = Math.sin(angle);
    const c = Math.cos(angle);

    // translate point back to origin:
    point.x -= posX;
    point.y -= posY;

    // rotate point
    const xnew = point.x * c - point.y * s;
    const ynew = point.x * s + point.y * c;

    // translate point back:
    point.x = xnew + posX;
    point.y = ynew + posX;
    return point;
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

    this.projection.setExtent(this.extent);
    this.view = new View({
      center: [683, 950],
      zoom: this.zoom,
      maxZoom: 8,
      minZoom: 0,
      extent: this.extent,
      projection: this.projection,
    });

    const layers = [];
    const imageExtends: Extent[] = [
      [0, 0, 2048 * 1, 2048 * 1],
      [-294, 462, 2537 * 0.91 + -294, 1249 * 0.91 + 462],
    ];
    this.maps.forEach((map, index) => {
      const clusterMobSource = new Cluster({
        distance: 18,
        source: new VectorSource({ features: map.mobs }),
      });

      const friendlySource = new VectorSource({ features: map.npc });
      const clusterInterSource = new Cluster({
        distance: 18,
        source: new VectorSource({ features: map.interactables }),
      });
      const mobLayer = new VectorLayer({
        className: "mobs",
        style: (feat: Feature) => {
          return this.createCachedStyle(feat);
        },
        source: clusterMobSource,
      });

      const interLayer = new VectorLayer({
        className: "interactables",
        style: (feat: Feature) => {
          return this.createCachedStyle(feat);
        },
        source: clusterInterSource,
      });

      const filterLayer = new VectorLayer({
        className: "filter",
        visible: false,
        style: (feat) => {
          return feat.get("style");
        },
        source: new VectorSource({ features: [] }),
      });

      const npcLayer = new VectorLayer({
        className: "friendlies",
        style: (feat) => {
          return feat.get("style");
        },
        source: friendlySource,
      });

      const mapLayer = new ImageLayer({
        className: "map",
        source: new Static({
          url: this.fullImagePath + map.SceneName + ".png",
          projection: this.projection,
          imageExtent: imageExtends[index],
        }),
      });

      layers[index] = new LayerGroup({
        layers: [mapLayer, mobLayer, interLayer, filterLayer, npcLayer],
      });
    });

    this.Map = new Map({
      layers: layers,
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

    this.Map.on("pointermove", (e) => {
      const coord = e.coordinate;
      if (this.Map.getFeaturesAtPixel(e.pixel).length === 0) {
        this.popupOverlay.setPosition(undefined);
      }
      this.Map.forEachFeatureAtPixel(e.pixel, (f) => {
        if (f.get("features") && f.get("features").length > 0) {
          f = f.get("features")[0];
        }
        const point: Point = <Point>f.getGeometry();
        const coord = point.getCoordinates();

        this.activeFeature = { ...f.getProperties() };
        this.popupOverlay.setPosition(coord);
      });
    });

    this.Map.on("singleclick", (evt) => {
      var coordinate = evt.coordinate;
      this.Map.forEachFeatureAtPixel(evt.pixel, (f) => {
        if (f.get("features") && f.get("features").length > 0) {
          f = f.get("features")[0];
        }
        if (f.get("icon") === "portal") {
          const map = this.activeMap == 0 ? 1 : 0;
          this.setActiveGroup(map);
        }
      });
    });

    this.Map.once('postrender', async (map) => {
      console.log(this.map.nativeElement);
      html2canvas(this.map.nativeElement).then(canvas => {
        console.log(canvas);
        this.sneaky.nativeElement.src = canvas.toDataURL();
        this.meta.updateTag({property: 'og:image', content: canvas.toDataURL('image/png')});
      });
    })


    this.Map.addInteraction(this.selected_feature);
    this.loading$.next(false);
    this.setActiveGroup(this.activeMap);
  }


  copyLink(inputElement) {
    inputElement.value = window.location.href;
    inputElement.select();
    document.execCommand('copy');
  }

  setFilters(filters) {
    const activeLayer = this.getActiveLayers();
    if (filters.length == 0) {
      activeLayer.getLayersArray().forEach((layer) => {
        layer.setVisible(true);
        if (layer.getClassName() === "filter") layer.setVisible(false);
      });
      return;
    }
    const test = this.maps[this.activeMap].features.filter((feature) => {
      return filters.includes(feature.get("name"));
    });

    activeLayer.getLayersArray().forEach((layer) => {
      layer.setVisible(false);
      if (layer.getClassName() === "filter" || layer.getClassName() === "map") {
        layer.setVisible(true);
      }
      if (layer.getClassName() === "filter")
        layer.setSource(new VectorSource({ features: test }));
    });
  }

  getActiveLayers() {
    return this.Map.getLayers().getArray()[this.activeMap];
  }

  setActiveGroup(id) {
    this.filters = this.maps[id].filters;
    this.returnMain = id == 0 ? false : true;
    this.activeMap = id;
    this.Map.getLayers()
      .getArray()
      .forEach((element) => {
        element.setVisible(false);
      });
    this.Map.getLayers().getArray()[id].setVisible(true);

    this.router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: { map: id },
        queryParamsHandling: 'merge', // remove to replace all query params by provided
      });

  }

  selected_feature = new Select({
    condition: pointerMove,
    style: (feat) => {
      if (feat.get("features") && feat.get("features").length > 0) {
        feat = feat.get("features")[0];
      }
      const point: Point = <Point>feat.getGeometry();
      const coord: number[] = point.getCoordinates();
      const name: string = <string>feat.get("icon");
      const color: string = <string>feat.get("color");
      return this.createStyle({ pos: coord, name, color }, 20, 1);
    },
  });

  createCachedStyle(feat: Feature) {
    const styleCache = {};
    const size = feat.get("features")[0].get("name");
    let style = styleCache[size];
    const point: Point = <Point>feat.getGeometry();
    const coord: number[] = point.getCoordinates();
    const stylePoint = {
      name: feat.get("features")[0].get("icon"),
      color: feat.get("features")[0].get("color"),
      pos: coord,
    };
    if (!style) {
      style = this.createStyle(stylePoint);
    }
    styleCache[size] = style;
    return style;
  }

  createDrops(totalWeight, drops: Drop[]) {
    return drops.map((drop) => {
      const numbers = this.reduce(drop.weight, totalWeight);
      const chance =
        isNaN(numbers[0]) || numbers[0] == 0
          ? "always"
          : `${numbers[0]} / ${numbers[1]}`;
      return { ...drop, chance };
    });
  }

  inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }


  private reduce(numerator: number, denominator: number) {
    let gcd: any = function gcd(a, b) {
      return b ? gcd(b, a % b) : a;
    };
    gcd = gcd(numerator, denominator);
    return [numerator / gcd, denominator / gcd];
  }

  slide(type, event) {
    const activeLayer = this.getActiveLayers();
    let mapLayer;
    activeLayer.getLayersArray().forEach((layer) => {
      if (layer.getClassName() === "map") mapLayer = layer;
    });
    switch (type) {
      case "x":
        this.x = parseInt(event.target.value);
        break;
      case "y":
        this.y = parseInt(event.target.value);
        break;
      case "s":
        this.s = parseFloat(event.target.value);
    }
    mapLayer.setSource(
      new Static({
        url: mapLayer.get("source").getUrl(),
        projection: this.projection,
        imageExtent: [
          this.x,
          this.y,
          3840 * this.s + this.x,
          3840 * this.s + this.y,
        ],
      })
    );
  }
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
  info: string;
  items: any[];
  health: number;
  totalweight?: number;
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
  red: "#c0392b",
  yellow: "#f1c40f",
  brown: "#cd6133",
  coal: "#2c3e50",
  vertium: "#27ae60",
  iron: "#e74c3c",
  copper: "#e67e22",
  purple: "#9b59b6",
  blue: "#2980b9",
};
