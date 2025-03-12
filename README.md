# pliot
Plotting for IoT

A responsive web-based visualization tool for IoT sensor data and equipment states.

## Features

- Interactive time series visualization using D3.js
- Dual-panel display showing:
  - Sensor readings as line graphs (top)
  - Equipment on/off states as bar indicators (bottom)
- Responsive design that adapts to different screen sizes
- Interactive cursor with value tooltips
- Configurable legend for both sensors and equipment

## Usage

1. Include required files:
```html
<link rel="stylesheet" href="style.css">
<div id="chart"></div>
<div id="chart_legend"></div>
```

2. Configure your data sources:
```javascript
const sensor_data = [
    ["sensor_0", "Temperature Sensor"],
    ["sensor_1", "Humidity Sensor"]
];

const equip_data = [
    ["equipment_0", "Relay 1"],
    ["equipment_1", "Relay 2"]
];
```

3. Initialize chart with JSON data:
```javascript
const chart = new Chart({
    container: "#chart",
    config: {
        lines: sensor_data,
        on_offs: equip_data
    },
    data: data
}).render();
```

## Data Format

Expected JSON format:
```json
{
    "sensor_0": [
        {"label": "2023-01-01T00:00:00", "value": 23.5},
        {"label": "2023-01-01T00:01:00", "value": 24.0}
    ],
    "equipment_0": [
        {"label": "2023-01-01T00:00:00", "value": 1},
        {"label": "2023-01-01T00:01:00", "value": 0}
    ]
}
```
