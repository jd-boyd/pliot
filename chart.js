"use strict";

import 'popper'
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";


function formatDateTime(d) {
    let dateString = (d.getMonth()+1)  + "/" + d.getDate() + "/" + d.getFullYear();
   
    let tfHours = d.getHours();
    let twHours = tfHours > 12 ? tfHours - 12 : tfHours;
    let hours = tfHours == 0 ? 12 : twHours;

    let timeString = hours.toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
    return dateString + " " + timeString + " " + (tfHours>11?'P':'A');;
}


class Chart {
    constructor(params) {
      const body = document.getElementsByTagName("body")[0];
	
    this.attrs = Object.assign(
      {
        container: "#chart",
        legend: "#chart_legend",
        width: body.clientWidth * 0.7,
        height: body.clientWidth * 2,
        data: [],
        padding: {
          top: body.clientWidth > 1000 ? 50 : 100,
          right: 30,
          bottom: 0,
          left: 20,
        },
        lineChartHeightRatio: 0.5, // vertical division ratio of line and on_offs
        chartsGap: 25, // vertical gap between line and on_offs
        colors: d3.schemeTableau10 // pass array of colors
      },
      params || {}
    );

    this.init_patternify();
  }

  init_patternify() {
    d3.selection.prototype.patternify = function (params) {
      var container = this;
      var selector = params.selector;
      var elementTag = params.tag;
      var data = params.data || [selector];

      // Pattern in action
      var selection = container.selectAll("." + selector).data(data, (d, i) => {
        if (typeof d === "object") {
          if (d.id) {
            return d.id;
          }
        }
        return i;
      });
      selection.exit().remove();
      selection = selection.enter().append(elementTag).merge(selection);
      selection.attr("class", selector);
      return selection;
    };
  }

  render() {
    if (!this.attrs.data || !this.attrs.config) {
      throw new Error("Data and/or Config missing");
    }

    this.makeDataReady();

    this.container = d3.select(this.attrs.container);
    this.colorScale = d3
      .scaleOrdinal()
      .domain(Object.keys(this.attrs.data))
      .range(this.attrs.colors);

    this.drawAll();
    d3.select(window).on("resize.chart_component", () => this.drawAll());

  }

  drawAll() {
    this.setDimensions();
    this.renderContainers();
    this.setUpScalesAndAxes();
    this.drawLines();
    this.addCursor();
    this.drawOnOffs();
    this.drawLegend();
  }

  renderContainers() {
    const state = this.attrs;

    this.svg = this.container
      .patternify({
        tag: "svg",
        selector: "svg-chart",
      })
      .attr("width", state.width)
      .attr("height", state.height);

    this.chart = this.svg
      .patternify({
        tag: "g",
        selector: "chart-group",
      })
      .attr(
        "transform",
        `translate(${state.padding.left}, ${state.padding.top})`
      );

    this.xAxis = this.chart.patternify({
      tag: "g",
      selector: "x-axis",
    });


    this.linesGroup = this.chart.patternify({
      tag: "g",
      selector: "lines-group",
    });

    this.mouseGroup = this.chart.patternify({
      tag: "g",
      selector: "mouse-group",
    });

    this.yAxisLines = this.linesGroup.patternify({
      tag: "g",
      selector: "y-axis",
    });

    this.onOffsGroup = this.chart
      .patternify({
        tag: "g",
        selector: "on-offs-group",
      })
      .attr(
        "transform",
        `translate(0, ${this.lineChartHeight + this.attrs.chartsGap})`
      );
  }

  setUpScalesAndAxes() {
    // SCALES
    this.xScale = d3
      .scaleTime()
      .domain(this.dateRange)
      .range([0, this.chartWidth]);

    this.yScaleLines = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(this.linesData, (d) => d3.max(d.line, (x) => x.value)),
      ])
      .range([this.lineChartHeight, 0]);

    this.yScaleOnOffs = d3
      .scaleBand()
      .domain(this.onOffsData.map((d) => d.key))
      .range([0, this.onOffsHeight])
      .paddingInner(0.2);

      const body = document.getElementsByTagName("body")[0];
							
      
    const rotateVal = body.clientWidth > 1000 ? -45 : - 90;
    const dxVal = body.clientWidth > 1000 ? 4 : 10;

    // AXES
    this.xAxis.call(
      d3.axisTop(this.xScale).tickSizeInner(-this.chartHeight).tickPadding(15)
        //.ticks(3)
        .tickFormat(function(d, i) {
          return d3.timeFormat("%Y-%m-%d %I:%M %p")(d)
        }) // returns a string
    )
    .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", dxVal + "em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(" + rotateVal + ")");

    this.yAxisLines.call(
      d3.axisLeft(this.yScaleLines).tickSize(-this.chartWidth).tickPadding(5)
    );

    // LINE
    this.lineGen = d3
      .line()
      .x((d) => this.xScale(d.date))
      .y((d) => {
        console.log("Y L " + d.value + " ret: " + this.yScaleLines(d.value));
        return this.yScaleLines(d.value);
      });

  }

  addCursor() {
    const width = this.chartWidth;
    const height = this.lineChartHeight;
    const x = this.xScale;
    const y = this.yScaleLines;
    const gap = this.attrs.chartsGap * 0.7;
    const formatTime = d3.timeFormat("%B %d, %H:%M %p");
    const data = this.linesData.map(m => {
      return {
        ...m,
        bands: m.line.map(d => {
          const bandWidth = Math.floor(x(d.nextDate) - x(d.date));
          const middlePoint = x(d.date) + bandWidth / 2;
          return middlePoint;
        }),
      }
    });

    this.mouseGroup
      .patternify({
        tag: "path",
        selector: "mouse-line",
      })
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", "0");

    const mouseDate = this.mouseGroup
      .patternify({
        tag: "text",
        selector: "mouse-date",
      })
      .attr("y", height + gap)
      .attr("x", 0)
      .attr("transform", `translate(10, -5)`)
      .attr("font-size", "11px")
      .attr("dy", "0.35em")
      .style("opacity", "0");

    var mousePerLine = this.mouseGroup.patternify({
      tag: "g",
      selector: "mouse-per-line",
      data: data,
    });

    mousePerLine
      .patternify({
        tag: "circle",
        selector: "circle-per-line",
        data: (d) => [d],
      })
      .attr("r", 5)
      .style("stroke", (d) => this.colorScale(d.key))
      .style("fill", "#fff")
      .style("stroke-width", "1px")
      .style("opacity", "0");

    mousePerLine
      .patternify({
        tag: "text",
        selector: "text-outline",
        data: (d) => [d],
      })
      .attr("transform", "translate(10,0)")
      .attr("font-size", "13px")
      .attr("dy", "0.35em")
      .attr('stroke-width', 2)
      .attr("stroke", "white");

    mousePerLine
      .patternify({
        tag: "text",
        selector: "text-per-line",
        data: (d) => [d],
      })
      .attr("transform", "translate(10,0)")
      .attr("font-size", "13px")
      .attr("dy", "0.35em");

    const hide = function () {
      // on mouse out hide line, circles and text
      d3.select(".mouse-line").style("opacity", "0");
      d3.selectAll(".mouse-per-line circle").style("opacity", "0");
      d3.selectAll(".mouse-per-line text").style("opacity", "0");
      mouseDate.style("opacity", "0");
    }

    const show = function () {
      // on mouse in show line, circles and text
      d3.select(".mouse-line").style("opacity", "1");
      d3.selectAll(".mouse-per-line circle").style("opacity", "1");
      d3.selectAll(".mouse-per-line text").style("opacity", "1");
      mouseDate.style("opacity", "1");
    }

    this.mouseGroup
      .patternify({
        tag: "rect",
        selector: "mouse-rect",
      })
      .attr("x", 0)
      .attr("width", this.chartWidth) // can't catch mouse events on a g element
      .attr("height", this.lineChartHeight)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mouseout", hide)
      .on("mouseover", show)
      .on("mousemove", (e) => {
        // mouse moving over canvas
        var mouse = d3.pointer(e);

        var textAnchor = "start";

        if (mouse[0] > width * 0.7) {
          textAnchor = "end";
        }

        d3.selectAll(".mouse-per-line").attr("transform", function (d, i) {
          var bisect = d3.bisector((d) => d).left;
          var idx = bisect(d.bands, mouse[0]);

          var datum = d.line[idx];

          if (!datum) {
            return hide();
          }

          var pos = {
            x: x(datum.date),
            y: y(datum.value),
          };

          d3.select(".mouse-line").attr("d", function () {
            var d = "M" + pos.x + "," + (height + gap);
            d += " " + pos.x + "," + 0;
            return d;
          });

          d3.select(this)
            .select("text.text-per-line")
            .attr("text-anchor", textAnchor)
            .attr('dx', textAnchor === 'end' ? -18 : 0)
            .text(function(d, i) {
              return d.line[i].value.toFixed(2);
            });
            //.text(datum.value);

          d3.select(this)
            .attr("text-anchor", textAnchor)
            .select("text.text-outline")
            .attr('dx', textAnchor === 'end' ? -18 : 0)
            .text(function(d, i) {
              return d.line[i].value.toFixed(2);
            });
            //.text(datum.value);

          mouseDate
            .text(formatTime(datum.date))
            .attr("x", pos.x)
            .attr('dx', textAnchor === 'end' ? -18 : 0)
            .attr("text-anchor", textAnchor);

          return "translate(" + pos.x + "," + pos.y + ")";
        });
      });
  }

  drawLines() {
    const group = this.linesGroup.patternify({
      tag: "g",
      selector: "lines",
    });

    const line = group
      .patternify({
        tag: "path",
        selector: "line",
        data: this.linesData,
      })
      .attr("d", (d) => this.lineGen(d.line))
      .attr("stroke", (d) => this.colorScale(d.key))
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("pointer-events", "none");
  }

  drawOnOffs() {
    const group = this.onOffsGroup
      .patternify({
        tag: "g",
        selector: "on-off-group",
        data: this.onOffsData,
      })
      .attr("fill", (d) => this.colorScale(d.key));

    const rect = group
      .patternify({
        tag: "rect",
        selector: "on-off",
        data: (d) => d.bars.filter((d) => d.value > 0),
      })
      .attr("x", (d) => this.xScale(d.startDate))
      .attr("width", (d) => {
        return Math.abs(this.xScale(d.startDate) - this.xScale(d.endDate));
      })
      .attr("height", this.yScaleOnOffs.bandwidth())
      .attr("y", (d) => this.yScaleOnOffs(d.key));
  }

  drawLegend() {
    const legendDiv = d3.select(this.attrs.legend);
    legendDiv.style('padding-top', (this.attrs.padding.top - 30) + "px");

    // Easy way to clear any existing children.
    legendDiv.html("");

    const lineLegend = legendDiv
      .patternify({
        tag: "div",
        selector: "lines-legend",
      })
      .style("height", this.lineChartHeight + this.attrs.chartsGap + "px");

    const items = lineLegend.patternify({
      tag: "div",
      selector: "legend-item",
      data: this.linesData,
    });

    items
      .patternify({
        tag: "div",
        selector: "legend-rect",
        data: (d) => [d],
      })
      .style("background", (d) => this.colorScale(d.key));

    items
      .patternify({
        tag: "div",
        selector: "legend-text",
        data: (d) => [d],
      })
      .attr('class', 'text-nowrap')
      .style('overflow', 'hidden')
      .html((d) => d.name);

    const onOffsLegend = legendDiv.patternify({
      tag: "div",
      selector: "on-offs-legend",
    });

    const items2 = onOffsLegend
      .patternify({
        tag: "div",
        selector: "legend-item",
        data: this.onOffsData,
      })
      .style("position", "absolute")
      .style("top", (d) => this.yScaleOnOffs(d.key) + "px")
      .style("left", 0)
      .style("height", this.yScaleOnOffs.bandwidth() + "px");

    items2
      .patternify({
        tag: "div",
        selector: "legend-rect",
        data: (d) => [d],
      })
      .style("background", (d) => this.colorScale(d.key));

    items2
      .patternify({
        tag: "div",
        selector: "legend-text",
        data: (d) => [d],
      })
      .attr('class', 'text-nowrap')
      .style('overflow', 'hidden')
      .html((d) => d.name);
  }

  setDimensions() {
    const { width, height } = this.container.node().getBoundingClientRect();

    if (width > 0) {
      this.attrs.width = width;
    }

    if (height > 0) {
      this.attrs.height = height;
    }

    const { top, right, bottom, left } = this.attrs.padding;

    this.chartWidth = this.attrs.width - left - right;
    this.chartHeight = this.attrs.height - top - bottom;
    this.lineChartHeight = this.chartHeight * this.attrs.lineChartHeightRatio;
    this.onOffsHeight =
      this.chartHeight * (1 - this.attrs.lineChartHeightRatio) -
      this.attrs.chartsGap;
  }

  makeDataReady() {
    const { lines, on_offs } = this.attrs.config;
    const data = this.attrs.data;

    this.dateRange = d3.extent(
      Object.values(data).flatMap((x) => x),
      (d) => new Date(d.label)
    );

    const parse = ([key, name]) => {
      //const arr = data[key];

      const arr = data[key].filter(item => item.value != null);

      return {
        key,
        name,
        line: arr.map((x, i) => {
          return {
            value: x.value,
            date: new Date(x.label),
            nextDate: arr[i + 1] ? new Date(arr[i + 1].label) : this.dateRange[1],
            label: x.label,
          };
        }),
      };
    };

    const parseOnOff = ([key, name]) => {
      const arr = data[key];

      return {
        key,
        name,
        bars: arr.map((x, i) => {
          const value = x.value;
          const startDate = new Date(x.label);
          const endDate = arr[i + 1]
            ? new Date(arr[i + 1].label)
            : this.dateRange[1];

          return {
            startDate,
            endDate,
            key,
            value,
          };
        }),
      };
    };

    this.linesData = lines.filter((d) => data[d[0]]).map(parse);
    this.onOffsData = on_offs.filter((d) => data[d[0]]).map(parseOnOff);
  }
}

export { Chart };
