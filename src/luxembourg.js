import axios from "axios";
import { xml2js } from "xml-js";
import "./styles.scss";

(function () {
	new Vue({
		el: "#app",
		data: {
			layers: null,
			map: null,
			loading: true,
			center: [49.8149618, 5.9531472],
			zoom: 10,
			base_url: "https://wmts1.geoportail.lu/opendata/service?",
			url: "https://wmts1.geoportail.lu/opendata/service?service=WMS&request=GetCapabilities",
			limits: "https://run.mocky.io/v3/c7b7bbdd-7351-4221-b558-53d390991d8a",
		},
		methods: {
			get_layers(arr) {
				if (Array.isArray(arr))
					return arr.map((l) => {
						let bbox = undefined;
						if (l.BoundingBox)
							bbox = l.BoundingBox.filter(
								(lyr) => lyr._attributes.CRS === "EPSG:3857"
							)[0];
						let ret = {
							id: l.Name._text,
							name: l.Title._text,
							bbox: bbox
								? `${bbox._attributes.minx},${bbox._attributes.miny},${bbox._attributes.maxx},${bbox._attributes.maxy}`
								: undefined,
						};
						ret.sublayers = l.Layer ? this.get_layers(l.Layer) : undefined;
						return ret;
					});
			},
			get_layerParams(layer) {
				return {
					layers: layer,
					version: "1.3.0",
					transparent: true,
					format: "image/png",
				};
			},
			show_layer(id, subid) {
				const sublayer = this.layers[id].sublayers[subid];
				const layer = L.tileLayer.wms(
					this.base_url,
					this.get_layerParams(sublayer.id)
				);
				this.map.addLayer(layer);
			},
		},
		mounted: function () {
			this.map = L.map("map");
			this.map.setView(this.center, this.zoom);
			/* L.tileLayer(
				"https://europa.eu/webtools/maps/tiles/osm-ec/{z}/{x}/{y}.png"
			).addTo(this.map); */
			axios
				.get(this.limits)
				.then((data) => {
					const polypoints = data.data.geometries[0].coordinates[0][0];
					L.polygon(
						polypoints.map((p) => p.reverse()),
						{
							weight: 3,
							color: "red",
							fillOpacity: 0,
						}
					).addTo(this.map);
				})
				.then(() =>
					axios(this.url)
						.then(({ data }) => xml2js(data, { compact: true, spaces: 4 }))
						.then((data) => {
							data = data.WMS_Capabilities.Capability.Layer;
							const layers = this.get_layers(data.Layer);
							return {
								title: data.Title._text,
								layers,
							};
						})
						.then((data) => {
							data.layers = data.layers.map((l) => {
								l.active = false;
								let sb = [];
								sb.push({
									active: false,
									bbox: l.bbox,
									id: l.id,
									name: l.name,
								});
								if (l.sublayers)
									l.sublayers.forEach((subl) => {
										subl.active = false;
										sb.push(subl);
									});
								l.sublayers = sb;
								return l;
							});
							this.layers = data.layers;
							console.log(this.layers);
							this.show_layer(12, 0);
							this.show_layer(12, 1);
							this.show_layer(12, 2);
							this.show_layer(12, 3);
							this.show_layer(5, 2);
							this.loading = false;
						})
						.catch((e) => console.log(e))
				);
		},
	});
})();
