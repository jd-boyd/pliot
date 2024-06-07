"use strict";

import { Chart } from "chart"
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let GRAPH_DATA = "/sample_data/sample1.json"

const equip_data = [["equipment_0", "Relay 1"],
		    ["equipment_1", "Relay 2"],
		    ["equipment_2", "Relay 3"],
		    ["equipment_3", "Relay 4"],
		    ["equipment_4", "Relay 5"],
		    ["equipment_5", "Relay 6"],
		    ["equipment_6", "Relay 7"],
		    ["equipment_7", "Relay 8"]];

const sensor_data = [["sensor_0", "First Temperator Sensor"],
		     ["sensor_1", "Second Sesor"]];

function App() {

    Promise.all([
	d3.json(GRAPH_DATA)
    ]).then(([ data ]) => {

	let config = {
	    lines: sensor_data,
	    on_offs: equip_data
	};

	document.getElementById("chart").innerHTML = "";

	const chart = new Chart({
            container: "#chart",
	    config: config,
	    data: data
	}).render();

	var insertLinebreaks = function (d) {
	    var el = d3.select(this);
	    var words = d.split(' ');
	    el.text('');

	    for (var i = 0; i < words.length; i++) {
		var tspan = el.append('tspan').text(words[i]);
		if (i > 0)
		    tspan.attr('x', 0).attr('dy', '15');
	    }
	};
    })

    return {};
}

window.addEventListener("DOMContentLoaded", function() {
    window.app = App();
});
