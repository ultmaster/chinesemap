let chineseMapView = $('#view1');
chineseMapView.height(chineseMapView.width() * 0.6);

let economyView = $('#view2');
economyView.height(economyView.width() * 0.2);

let lineChartView = $('#view3');
lineChartView.height(lineChartView.width() * 0.5);

const colorScheme = [
  d3.interpolateOrRd,
  d3.interpolateBuGn,
  d3.interpolateBuPu,
  d3.interpolateGnBu,
  d3.interpolatePuRd,
  d3.interpolatePuBuGn,
  d3.interpolateRdPu,
  d3.interpolateYlGnBu,
  d3.interpolateYlGn,
  d3.interpolateYlOrRd
];

let categoryObject = {};
$("#category").find("option").each(function () {
  categoryObject[$(this).val()] = $(this).html();
});
const colorSchemeScale = d3.scaleOrdinal(colorScheme).domain(Object.keys(categoryObject));
let data = {};
for (let c in categoryObject)
  d3.csv("data/" + c + ".csv")
    .then(function (d) {
      data[c] = d;
      if (Object.keys(data).length >= 11) {
        init();
      }
    });
d3.csv("data/gdp.csv")
  .then(function (d) {
    data["gdp"] = d;
    if (Object.keys(data).length >= 11) {
      init();
    }
  });

let settings = {
  "time": 2016,
  "region": "上海",
  "typeValue": "peopleTot",
};
// set default
function setDefault() {
  settings.typeValue = $("#category").val();
  settings.time = $("#time").val();
  $("#timeDisplayer").html(settings.time);
  updateSettings();
}
$("#category, #time").on("input", setDefault);

function getDataOnTypeYear(type, year) {
  let d = data[type];
  let ret = {};
  for (let i = 0; i < d.length; ++i) {
    if (d[i].hasOwnProperty("region"))
      ret[d[i].region] = parseFloat(d[i]["" + year]);
  }
  return ret;
}

function getDataOnTypeRegion(type, region) {
  let d = data[type];
  let ret = [];
  for (let i = 0; i < d.length; ++i)
    if (d[i].hasOwnProperty("region") && d[i].region === region) {
      for (let year = 2007; year <= 2016; ++year)
        ret.push(parseFloat(d[i]["" + year]));
      break;
    }
  return ret;
}

function getDataOnRegionYear(region, year) {
  if (!year || year < 2007 || year > 2016)
    return {};
  let ret = {};
  for (let type in data) {
    if (type === "gdp") continue;
    let d = data[type];
    for (let i = 0; i < d.length; ++i)
      if (d[i].hasOwnProperty("region") && d[i].region === region) {
        ret[type] = parseFloat(d[i][year]);
        break;
      }
  }
  return ret;
}

function getDataValuesOnType(type) {
  let d = data[type];
  let ret = [];
  for (let i = 0; i < d.length; ++i) {
    if (!d[i].hasOwnProperty("region"))
      continue;
    for (let k in d[i]) {
      let v = d[i][k];
      if (v !== "") ret.push(parseFloat(v));
    }
  }
  return ret;
}

function init() {
  renderMap();
  renderEconomy();
  renderLineChart();
}

function updateSettings() {
  renderMap();
  renderEconomy();
  renderLineChart();
}

function renderMap() {
  let width = chineseMapView.width();
  let height = chineseMapView.height();
  d3.select("#view1").selectAll("svg").remove();
  let svg = d3.select("#view1").append("svg")
      .attr("width", width).attr("height", height);

  let projection = d3.geoMercator()
    .center([107, 31])
    .scale(width * 0.7)
    .translate([width / 2, height / 2 + height / 6]);
  let path = d3.geoPath().projection(projection);
  let densityData = getDataOnTypeYear(settings.typeValue, settings.time);
  let densityValues = getDataValuesOnType(settings.typeValue);
  densityValues.push(0);

  let color = d3.scaleSequential(colorSchemeScale(settings.typeValue));
  color.domain(d3.extent(densityValues));

  function getRegionColor(d) {
    if (densityData.hasOwnProperty(d.properties.name) && densityData[d.properties.name])
      return color(densityData[d.properties.name]);
    return "white";
  }

  svg.selectAll("path")
    .data(china.features)
    .enter()
    .append("path")
    .attr("stroke", "#000")
    .attr("stroke-width", 0.5)
    .attr("fill", getRegionColor)
    .attr("d", path)
    .on("mouseover", function (d, i) {
      d3.select(this)
        .attr("fill", "yellow");
    })
    .on("mouseout", function (d, i) {
      d3.select(this)
        .attr("fill", getRegionColor(d));
    });
}

function renderEconomy() {
  let width = economyView.width();
  let height = economyView.height();
  d3.select("#view2").selectAll("svg").remove();
  let svg = d3.select("#view2").append("svg")
    .attr("width", width).attr("height", height);
  let g = svg.append("g");

  let x = d3.scaleBand()
    .rangeRound([0, width])
    .paddingInner(0.05)
    .align(0.1);

  let y1Max = height / 2 - 1;
  let y1 = d3.scaleLinear().rangeRound([y1Max, 0]);
  let y2 = d3.scaleLinear().rangeRound([0, height / 2]);
  let color = colorSchemeScale(settings.typeValue);

  let dataset1 = getDataOnTypeYear(settings.typeValue, settings.time);
  let dataset2 = getDataOnTypeYear("gdp", settings.time);
  let data = [];
  for (let k in dataset1)
    data.push({"region": k, "val": dataset1[k] ? parseFloat(dataset1[k]) : 0, "gdp": dataset2[k] ? parseFloat(dataset2[k]) : 0});
  data.sort(function (a, b) { return b.gdp - a.gdp; });
  x.domain(data.map(function (d) { return d.region; }));
  y1.domain([0, d3.max(getDataValuesOnType(settings.typeValue))]);
  y2.domain([0, d3.max(getDataValuesOnType("gdp"))]);

  g.append("g").selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("fill", color(0.4))
    .attr("x", function (d) { return x(d.region); })
    .attr("y", function (d) { return y1(d.val); })
    .attr("height", function (d) { return y1Max - y1(d.val); })
    .attr("width", x.bandwidth());

  g.append("g").selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("fill", color(0.7))
    .attr("x", function (d) { return x(d.region); })
    .attr("y", height / 2)
    .attr("height", function (d) { return y2(d.gdp); })
    .attr("width", x.bandwidth());

  g.append("text").attr("text-anchor", "end").attr("x", width * 0.95).attr("y", height * 0.8).text("地区生产总值")
    .style("font-size", (height / 8) + "px").attr("fill", "#555");
  g.append("text").attr("text-anchor", "end").attr("x", width * 0.95).attr("y", height * 0.2).text(categoryObject[settings.typeValue])
    .style("font-size", (height / 8) + "px").attr("fill", "#555");
}

function renderLineChart() {
  let width = lineChartView.width();
  let height = lineChartView.height();
  d3.select("#view3").selectAll("svg").remove();
  let svg = d3.select("#view3").append("svg")
    .attr("width", width).attr("height", height).style("overflow", "visible");
  let paddingHeight = height * 0.1;
  let lineHeight = (height - 3 * paddingHeight) / 3, lineWidth = width * 0.6;
  let textWidth = width * 0.35;
  let xScale = d3.scaleLinear().range([0, lineWidth]).domain([2007, 2016]);
  let xAxis = d3.axisBottom(xScale).tickFormat(function (d) { return "" + d; });
  let xAxisWithoutTick = d3.axisBottom(xScale).tickFormat("");

  let lineGroup = svg.append("g").attr("width", lineWidth).attr("height", height);
  const groupType = ["length", "people", "throughput"];
  const busType = ["Bus", "Metro", "Tot"];
  let busNames = [];
  for (let i = 0; i < groupType.length; ++i) {
    const groupName = groupType[i];
    let localLines = lineGroup.append("g").attr("width", lineWidth).attr("height", lineHeight)
      .attr("transform", "translate(0," + (lineHeight * i + (i + 1) * paddingHeight) + ")");
    let pd = [], tp = [], pd2 = [];
    for (let j = 0; j < busType.length; ++j) {
      let busName = groupName + busType[j];
      busNames.push(busName);
      let newData = getDataOnTypeRegion(busName, settings.region);
      pd.push(newData);
      tp.push(busName);
      pd2.push({name: busName, data: newData});
    }
    let yMax = d3.max(pd, function (d) {
      return d3.max(d);
    });
    let yScale = d3.scaleLinear().range([lineHeight, 0]).domain([0, yMax]);
    localLines.selectAll("path").data(pd).enter().append("path")
      .attr("fill", "none")
      .attr("stroke", function (d, i) {
        return colorSchemeScale(tp[i])(0.8);
      })
      .attr("stroke-width", 2)
      .attr("d", function (p) {
        let line = d3.line()
          .x(function (d, i) {
            return xScale(i + 2007);
          })
          .y(function (d) {
            return yScale(d);
          });
        return line(p);
      });
    localLines.selectAll("g").data(pd2).enter().append("g")
      .selectAll("circle").data(function (d) { return d.data; }).enter().append("circle")
      .attr("class", "line-chart-circle")
      .attr("cx", function (d, i) { return xScale(i + 2007) })
      .attr("cy", function (d) { return yScale(d); })
      .attr("fill", function (d) { return colorSchemeScale(d3.select(this.parentNode).datum().name)(0.8); })
      .attr("opacity", 0)
      .attr("r", 3.5)
      .on("show", function (d, i) {
        let event = d3.event;
        if (event.detail.index === i)
          d3.select(this).attr("opacity", 0.8);
        else d3.select(this).attr("opacity", 0);
      })
      .on("disappear", function () {
        d3.select(this).attr("opacity", 0);
      });
    // add axis
    let axisGroup = svg.append("g").attr("transform", "translate(0," + ((i + 1) * (lineHeight + paddingHeight)) + ")");
    axisGroup.call(i + 1 === groupType.length ? xAxis : xAxisWithoutTick);
  }

  // build text
  let textGroup = svg.append("g").attr("width", textWidth).attr("height", height)
    .attr("transform", "translate(" + (width - textWidth)  + ",0)");
  busNames.push("taxi");
  textGroup.append("text").attr("dy", 50).style("font-size", 40).text(settings.region);
  let labelGroupHeight = height - 60;
  let labelGroup = textGroup.append("g").attr("transform", "translate(0,60)").attr("height", labelGroupHeight)
    .attr("class", "label-group");

  labelGroup.on("show", function () {
    let event = d3.event;
    let year = 0;
    if (event.detail.hasOwnProperty("year"))
      year = event.detail.year;
    let dregion = getDataOnRegionYear(settings.region, year);
    labelGroup.selectAll("text").data(busNames).enter().append("text");
    labelGroup.selectAll("text").text(function (d) {
        let dval = "NaN";
        if (dregion.hasOwnProperty(d))
          dval = dregion[d];
        return categoryObject[d] + ": " + dval.toLocaleString();
      })
      .style("font-size", 16)
      .attr("dy", function (d, i) {
        return labelGroupHeight / 10 * (i + 1);
      })
      .attr("fill", function (d) {
        return colorSchemeScale(d)(0.8);
      });
  });
  d3.selectAll(".label-group").dispatch("show", {
    detail: {
      year: 0
    }
  });

  // console.log(


  // build interactive layer
  let interactiveWrap = svg.append('g');
  let interactiveLineWrap = interactiveWrap.append('g').attr('opacity', 0);
  let interactiveLine = interactiveLineWrap.append('line').attr('y1', 0).attr('y2', height)
    .attr('x1', 0).attr('x2', 0).attr('stroke', '#999').attr('stroke-width', 3);
  interactiveWrap.append('rect')
    .attr('width', lineWidth)
    .attr('height', height)
    .attr('fill', '#000')
    .attr('opacity', 0)
    .on('mouseover', function (d) {
      interactiveLineWrap.attr('opacity', 0.7);
    })
    .on('mousemove', function () {
      let x = d3.mouse(interactiveWrap.node())[0];
      interactiveLine.attr('x1', x).attr('x2', x);
      interactiveLineWrap.attr('opacity', 0.5);
      let idx = Math.round(9.0 * x / lineWidth);
      d3.selectAll(".line-chart-circle").dispatch("show", {
        detail: {
          index: idx
        }
      });
      d3.selectAll(".label-group").dispatch("show", {
        detail: {
          year: idx + 2007
        }
      });
    })
    .on('mouseout', function (d) {
      interactiveLineWrap.attr('opacity', 0);
      d3.selectAll(".line-chart-circle").dispatch("disappear");
    });

    //
    //
    // var dcWrap = container.selectAll('g.d-c-wrap').data([data]);
    // dcWrap.enter().append('g')
    //   .attr('class', 'd-c-wrap')
    //   .attr('transform', 'translate(0,' + axes.charts('corrDisp') + ')');
    //
    // var dcText = dcWrap.append('text')
    //   .attr('transform', 'translate(-11,' + lineHeight/2 + ')')
    //   .attr('dy', '.3em')
    //   .attr('text-anchor', 'end');
    //
    // dcText.append('tspan')
    //   .text('Correlation/');
    // dcText.append('tspan')
    //   .text('Dispersion')
    //   .attr('x', '0')
    //   .attr('y', '1.4em');
    //
    // var keys = ['corr','disp'];
    // var linesWrap = dcWrap.selectAll('g').data(function(d) {
    //   var a = keys.map(function(k) {
    //     return {
    //       data: d,
    //       key: k
    //     };
    //   })
    //   return a;
    // });
    // linesWrap.enter().append('g').attr('class', 'lines-wrap');
    //
    // var line = d3.svg.line()
    //   .x(function(d) { return axes.timeX(new Date(d.date)); });
    //
    // var linesPath = linesWrap.selectAll('path').data(function(d,i) {
    //   keys[i] = d.key
    //   return [d.data];
    // });
    //
    // linesPath.enter().append('path')
    //   .attr('d', function(d,i,j) {
    //     var k = keys[j];
    //     line.y(function(d) { return axes.lineY(d[k]); })
    //     return line(d,i);
    //   })
    //   .attr('stroke', function(d,i,j) { return getColor(keys[j]) })
    //   .attr('stroke-width', 2)
    //   .attr('fill', 'none');
    //
    // dcWrap.append('g')
    //   .attr('class', 'z-line');
    //
    // var zLine = dcWrap.select('.z-line');
    //
    // zLine.append('text')
    //   .text(0)
    //   .attr('x', lineWidth - visPadding.middle)
    //   .attr('y', axes.lineY(0))
    //   .attr('dy', '0.33em')
    //   .attr('dx', '1em')
    //   .attr('text-anchor', 'end');
    //
    // return dcWrap;

  // getColor = function(d) {
  //   if(d.key) return axes.chartColors(d.key);
  //   else return axes.chartColors(d);
  // }

  // window.buildChart = function(data) {
  //   axes = new Axes(data);
  //
  //   container = d3.select('#chart-container').selectAll('g.container').data([data]);
  //   container.enter().append('g')
  //     .attr('class', 'container')
  //     .attr('transform', 'translate(' + visPadding.left + ',' + visPadding.top + ')');
  //
  //   var skeleton = buildSkeleton(data);
  //   var disCorrLines = buildDisCorr(data);
  //   var alphaBars = buildAlpha(data);
  //   var scatter = buildScatter(data);
  //   var text = buildTextBox(data);
  //   var interactiveLayer = buildInteractiveLayer(data);
  //   var tooltips = setupTooltips(scatter, interactiveLayer, text, data);
  // }

  buildSkeleton = function(data) {

    var xAxis = d3.svg.axis()
      .scale(axes.timeX)
      .orient('bottom');

    container.append('g')
      .attr('class', 'x-axis')
      .attr('transform', 'translate(0,' + (axes.charts('corrDisp') + axes.lineY(0)) + ')')
      .call(xAxis);

  }

  buildDisCorr = function(data) {

    var dcWrap = container.selectAll('g.d-c-wrap').data([data]);
    dcWrap.enter().append('g')
      .attr('class', 'd-c-wrap')
      .attr('transform', 'translate(0,' + axes.charts('corrDisp') + ')');

    var dcText = dcWrap.append('text')
      .attr('transform', 'translate(-11,' + lineHeight/2 + ')')
      .attr('dy', '.3em')
      .attr('text-anchor', 'end');

    dcText.append('tspan')
      .text('Correlation/');
    dcText.append('tspan')
      .text('Dispersion')
      .attr('x', '0')
      .attr('y', '1.4em');

    var keys = ['corr','disp'];
    var linesWrap = dcWrap.selectAll('g').data(function(d) {
      var a = keys.map(function(k) {
        return {
          data: d,
          key: k
        };
      })
      return a;
    });
    linesWrap.enter().append('g').attr('class', 'lines-wrap');

    var line = d3.svg.line()
      .x(function(d) { return axes.timeX(new Date(d.date)); });

    var linesPath = linesWrap.selectAll('path').data(function(d,i) {
      keys[i] = d.key
      return [d.data];
    });

    linesPath.enter().append('path')
      .attr('d', function(d,i,j) {
        var k = keys[j];
        line.y(function(d) { return axes.lineY(d[k]); })
        return line(d,i);
      })
      .attr('stroke', function(d,i,j) { return getColor(keys[j]) })
      .attr('stroke-width', 2)
      .attr('fill', 'none');

    dcWrap.append('g')
      .attr('class', 'z-line');

    var zLine = dcWrap.select('.z-line');

    zLine.append('text')
      .text(0)
      .attr('x', lineWidth - visPadding.middle)
      .attr('y', axes.lineY(0))
      .attr('dy', '0.33em')
      .attr('dx', '1em')
      .attr('text-anchor', 'end');

    return dcWrap;
  }

  buildAlpha = function(data) {
    var alphaWrap = container.selectAll('g.alpha-warp').data([data]);
    alphaWrap.enter().append('g')
      .attr('class', 'alpha-wrap')
    ;

    var keys = ['fof','hfri','hfu'];
    var barsWrap = alphaWrap.selectAll('g.bars-wrap').data(function(d) {
      var a = keys.map(function(k) {
        return {
          data: d,
          key: k
        };
      })
      return a;
    });

    barsWrap.enter().append('g')
      .attr('class', 'bars-wrap')
      .attr('transform', function(d) {
        return 'translate(0,' + axes.charts(d.key) + ')';
      });

    barsWrap.append('text')
      .text(function(d) { return keyReplace[d.key] + ' Alpha'; })
      .attr('transform', 'translate(-11,' + lineHeight/2 + ')')
      .attr('text-anchor', 'end')
      .attr('dy', '.3em');

    var bars = barsWrap.selectAll('rect').data(function(d) {
      return d.data
    });

    bars.enter().append('rect')
      .attr('fill', function(d,i,j) { return getColor(keys[j]) })
      .attr('x', function(d) { return axes.timeX(new Date(d.date)); })
      .attr('y', function(d,i,j) { return axes[keys[j] + 'Y'](d[keys[j]]); })
      .attr('height', function(d,i,j) {
        var num = d[keys[j]];
        var yPos = axes[keys[j] + 'Y'](num);

        if(num > 0) return lineHeight/2 - yPos;
        else if(num == 0) return 0;
        else if(num < 0) {
          return lineHeight/2 - axes[keys[j] + 'Y'](Math.abs(num));
        }
      })
      .attr('width', 2.5)
    ;

    barsWrap.append('g')
      .attr('class', 'z-line');

    var zLine = barsWrap.select('.z-line')
    // .attr('transform', 'translate(0,' + axes[d.key + 'Y'](0) + ')');

    zLine.append('line')
      .attr('x1', 0)
      .attr('x2', lineWidth - visPadding.middle)
      .attr('y1', function(d) { return axes[d.key + 'Y'](0)})
      .attr('y2', function(d) { return axes[d.key + 'Y'](0)});

    zLine.append('text')
      .text(0)
      .attr('x', lineWidth - visPadding.middle - 4)
      .attr('y', function(d) { return axes[d.key + 'Y'](0)})
      .attr('dy', '0.3em')
      .attr('dx', 11);

    return alphaWrap;
  }

  buildTextBox = function(data) {
    var tWrap = container.append('g')
      .attr('class', 'text-wrap')
      .attr('transform', 'translate(' + (lineWidth + visPadding.middle - visPadding.left) + ',' + (scatterHeight + visPadding.top + 114) + ')');

    var labels = ['Fund', 'IDX B', 'IDX A', 'Correlation', 'Dispersion', 'Date'];
    var keys = ['fof', 'hfri', 'hfu', 'corr', 'disp', 'date'];
    var o = labels.map(function(d,i) {
      return { label: d, key: keys[i] };
    });

    var textScale = d3.scale.ordinal();
    textScale
      .domain(o.map(function(d) { return d.key }))
      .range(d3.range(0,81,27))
    // .range(d3.range(0,108,54))

    var ttLabel = tWrap.selectAll('text.tt-label').data(o);
    ttLabel.enter().append('text')
      .attr('class', function(d) { return 'tt-label ' + d.key })
      .attr('x', function(d,i) { return i < 3 ? 18 : scatterWidth/2 + 20 })
      // .attr('text-anchor', 'end')
      .attr('y', function(d,i) { return textScale(d.key) + i%3 * 27 })
      .attr('fill', getColor)
      .text(function(d) { return d.label });

    var ttVal = tWrap.selectAll('text.tt-value').data(o);
    ttVal.enter().append('text')
      .attr('class', function(d) { return 'tt-value ' + d.key })
      .attr('y', function(d,i) { return textScale(d.key) + (i%3 * 27) + 18 })
      .attr('x', function(d,i) { return i < 3 ? 18 : scatterWidth/2 + 20 })
      .attr('text-anchor', 'start')
      .text('-');

    return ttVal;
  };

  buildInteractiveLayer = function(data) {
    var iWrap = container.selectAll('g.interactive-wrap').data([data]);
    iWrap.enter().append('g').attr('class', 'interactive-wrap');

    var lineWrap = iWrap.append('g')
      .attr('class', 'line-wrap')
      .attr('opacity', 0);

    lineWrap.append('line')
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('dx', 1)
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

    var valBoxes = lineWrap.selectAll('rect.text-box').data(['fof','hfri','hfu','corr','disp']);

    valBoxes.enter().append('rect')
      .attr('class',function(d) { return 'text-box ' + d })
      .attr('x',2)
      .attr('y', axes.charts)
      .attr('fill', '#fff')
      .attr('height', function(d) { return d == 'corrDisp' ? 32 : 16 })
      .attr('width', 50);

    valBoxes.enter().append('text')
      .attr('x',4)
      .attr('y', function(d) { return axes.charts(d) + 11 })
      .attr('fill', getColor)
      .text('')

    iWrap.append('rect')
      .attr('width', lineWidth - visPadding.middle)
      .attr('height', chartHeight)
      .attr('class', 'interactive-layer')
      .attr('fill', '#000')
      .attr('opacity', 0)
      .on('mouseover', dispatch.iTooltip)
      .on('mousemove', dispatch.iTooltip)
      .on('mouseout', dispatch.hideTooltip);

    return lineWrap;

  }

  setupTooltips = function(circles, line, text, data) {

    dispatch.on('iTooltip', function(d,i,ext) {
      var x = d3.event.layerX - visPadding.left;
      var location = 0;
      var point;

      if(!d.point) {
        var leftEdges = axes.interactiveX.range();
        var width = axes.interactiveX.rangeBand();
        while(x > (leftEdges[location] + width)) {
          location++
        }
        location = Math.min(++location,d.length-1)
        point = d[location];
      } else {
        point = d.point;
      }

      circles.each(function(k,i,j) {
        if(point.date === k.date) {
          d3.select(this)
            .attr('fill', function(d) { return d.avgAlpha < 0 ? '#DAA0A2' : '#C8DDEC' })
            .attr('stroke', 'black') //function(d) { return d.avgAlpha < 0 ? '#DAA0A2' : '#C8DDEC' })
            .transition().duration(200)
            .attr('opacity', 1)
            .attr('stroke-width', 3);
        }
        else {
          d3.select(this)
            .attr('fill', '#ccc')
            .attr('stroke', '#ccc')
            .transition().duration(200)
            .attr('opacity', 0.8)
            .attr('stroke-width', 1);
        }
      });

      if(d.point) {
        var dDate = new Date(d.point.date);
        dDate = dDate.getTime();

        line.transition().duration(300)
          .attr('opacity',1)
          .attr('transform', 'translate(' + (axes.timeX(dDate) + 2) + ',0)');

      } else {
        if(!line.classed('active')) {
          line.transition().duration(200)
            .attr('opacity',1);
        }

        line
          .classed('active', true)
          .attr('transform', 'translate(' + (x + 2) + ',0)');
      }

      showText(point,i);

    });

    dispatch.on('hideTooltip', function(d,i,ext) {

      circles
        .attr('fill', function(d) { return d.avgAlpha < 0 ? '#DAA0A2' : '#C8DDEC' })
        .attr('stroke', function(d) { return d.avgAlpha < 0 ? '#DAA0A2' : '#C8DDEC' })
        .transition()
        .attr('opacity', 1)
        .attr('stroke-width', 1);

      text.text('-')

      line
        .classed('active', false)
        .transition().duration(200)
        .attr('opacity',0);
    });

    function showText(o) {
      line.selectAll('text').text(function(d) {
        var num = o[d];
        if(num === null) { return 'N/A'; }
        else { return num.toFixed(2) + '%'; }
      });

      text
        .text(function(d) {
          if(d.key == 'date') {
            var retDate = new Date(o[d.key]);
            retDate = retDate.getMonth()+1 + '/' + (1900 + retDate.getYear());
            return retDate;
          } else {
            var retVal = o[d.key];

            if(o[d.key] === null) { return 'N/A'; }
            else { return retVal.toFixed(2) + '%'; }
          }

        })
        .attr('fill', function(d) { return o[d.key] < 0 ? '#D6616B' : '#000' });
    }

  }

  buildScatter = function(data) {
    var scatterWrap = container.selectAll('g.scatter-wrap').data([data])
    scatterWrap.enter().append('g')
      .attr('class', 'scatter-wrap')
      .attr('transform', 'translate(' + (lineWidth) + ',' + (visPadding.top + 25) + ')');

    var xAxis = d3.svg.axis()
      .scale(axes.scatterX)
      .orient('bottom');

    var yAxis = d3.svg.axis()
      .scale(axes.scatterY)
      .orient('right');

    var x = scatterWrap.append('g')
      .attr('class','x-axis')
      .attr('transform', 'translate(0,' + axes.scatterY.range()[1] + ')')
      .call(xAxis);

    x.append('text')
      .text('Correlation ->')
      .attr('transform', 'translate(' + axes.scatterX.range()[0] + ',' + (scatterWidth - axes.scatterY.range()[0]) + ')')
      .attr('dx', 3)
      .attr('dy', 11);

    var y = scatterWrap.append('g')
      .attr('class','y-axis')
      .attr('transform', 'translate(' + axes.scatterX.range()[1] + ',0)')
      .call(yAxis);

    y.append('text')
      .text('Dispersion ->')
      .attr('transform', 'translate(' + axes.scatterX.range()[0] + ',' + axes.scatterY.range()[0] + ')rotate(-90)')
      .attr('dx', 3)
      .attr('dy', 11);

    var pointsWrap = scatterWrap.append('g')
      .attr('class', 'points-wrap');

    var points = pointsWrap.selectAll('g.scatter-points').data(function(d,i) {
      d.forEach(function(d) {
        d.avgAlpha = d3.mean([d.hfu,d.hfri,d.fof]);
      });
      return [d];
    });

    points.enter().append('g')
      .attr('class', 'scatter-points')

    var circles = points.selectAll('circle.point').data(function(d) {
      return d;
    });

    circles.enter().append('circle')
      .attr('class', function(d,i,j) {
        // var currDate = new Date(d.date);
        // d.point = i;
        // d.group = j;
        // d.month = currDate.getMonth() + 1;
        // d.year = currDate.getYear();
        // d.day = currDate.getDate();
        return 'point point-' + i + ' group-' + j
      })
      .attr('r', function(d,i,j) {
        if(d.avgAlpha !== undefined) return axes.alphaY(d.avgAlpha)
        else return 0;
      })
      .attr('cx', function(d) { return axes.scatterX(d.corr) })
      .attr('cy', function(d) { return axes.scatterY(d.disp) })
      .attr('fill-opacity', 0.8)
      .attr('stroke-opacity',0.5)
      .attr('fill', function(d) { return d.avgAlpha < 0 ? '#DAA0A2' : '#C8DDEC' })
      .attr('stroke', function(d) { return d.avgAlpha < 0 ? '#DAA0A2' : '#C8DDEC' });

    var voronoi = d3.geom.voronoi()
      .clipExtent([[-10,-10],[scatterWidth + 10, scatterWidth + 10]])
      .x(function(d) { return axes.scatterX(d.corr) })
      .y(function(d) { return axes.scatterY(d.disp) });

    var vWrap = pointsWrap.append('g').attr('class', 'voronoi');

    var vPath = vWrap.selectAll('path').data(function(d) {
      return voronoi(d).filter(function(d) { return d; });
    });

    vPath.enter().append('path')
      .attr('opacity', 0)
      .attr('fill','#000')
      .attr('stroke','#fff')
      .attr('d', function(d) { return 'M' + d.join('L') + 'Z'; })
      .on('mouseover', dispatch.iTooltip)
      .on('mouseout', dispatch.hideTooltip);

    return circles;
  }

  Axes = function(data) {
    this.chartColors = d3.scale.ordinal();
    this.chartColors
      .domain(['corr', 'disp', 'hfu', 'hfri', 'fof', 'date'])
      .range(['#FC9E27', '#3A7FA3', '#B5CF6B', '#D6616B', '#E7BA52', '#888']);

    this.timeX = d3.time.scale();

    var dateStart = new Date(data[0].date);
    var dateEnd = new Date(data[data.length - 1].date);

    this.timeX.domain([dateStart,dateEnd]);
    this.timeX.range([0,lineWidth-visPadding.middle]);

    this.interactiveX = d3.scale.ordinal();
    this.interactiveX.domain(d3.range(0,data.length,1));
    this.interactiveX.rangeBands([0,lineWidth - visPadding.middle])

    var maxD = d3.max(data, function(d) { return d.disp; });
    var maxC = d3.max(data, function(d) { return d.corr; });
    var maxDC = d3.max([maxD, maxC]);

    var minD = d3.min(data, function(d) { return d.disp; });
    var minC = d3.min(data, function(d) { return d.corr; });
    var minDC = d3.min([minD, minC]);

    this.lineY = d3.scale.linear();
    this.lineY.domain([minDC < 0 ? minDC : 0, maxDC]);
    this.lineY.range([lineHeight,0]);

    var maxFOF = d3.max(data, function(d) { return d.fof; });
    var maxHFRI = d3.max(data, function(d) { return d.hfri; });
    var maxHFU = d3.max(data, function(d) { return d.hfu; });


    var minFOF = d3.min(data, function(d) { return d.fof; });
    var minHFRI = d3.min(data, function(d) { return d.hfri; });
    var minHFU = d3.min(data, function(d) { return d.hfu; });


    var fofBound = Math.max(Math.abs(minFOF), Math.abs(maxFOF));
    var hfriBound = Math.max(Math.abs(minHFRI), Math.abs(maxHFRI));
    var hfuBound = Math.max(Math.abs(minHFU), Math.abs(maxHFU));

    this.fofY = d3.scale.linear();
    this.fofY.domain([-fofBound, 0, fofBound])
    this.fofY.range([lineHeight/2, lineHeight/2, 0]);

    this.hfriY = d3.scale.linear();
    this.hfriY.domain([-hfriBound, 0, hfriBound])
    this.hfriY.range([lineHeight/2, lineHeight/2, 0]);

    this.hfuY = d3.scale.linear();
    this.hfuY.domain([-hfuBound, 0, hfuBound])
    this.hfuY.range([lineHeight/2, lineHeight/2, 0]);

    //For scatter only
    var maxFH = d3.max([maxFOF,maxHFU]);
    var minFH = d3.min([minFOF,minHFU]);

    var alphaBound = Math.max(Math.abs(minFH), Math.abs(maxFH));
    this.alphaY = d3.scale.linear();
    this.alphaY.domain([-alphaBound, 0,alphaBound]);
    this.alphaY.range([12, 2, 12]);

    this.quadrants = {};
    this.quadrants.hfu = d3.scale.linear();
    this.quadrants.fof = d3.scale.linear();

    this.scatterX = d3.scale.linear();
    this.scatterY = d3.scale.linear();

    var medD = d3.median(data, function(d) { return d.disp; });
    var medC = d3.median(data, function(d) { return d.corr; });
    this.scatterX.domain([minC, medC, maxC]);
    this.scatterY.domain([minD, medD, maxD]);

    this.scatterX.range([0, scatterWidth/2, scatterWidth]);
    this.scatterY.range([scatterHeight, scatterHeight/2, 0]);

    var cDHeight = 3*(lineHeight + chartPadding);
    this.charts = d3.scale.ordinal();
    this.charts
      .domain(['corr','disp','corrDisp', 'hfri', 'hfu', 'fof'])
      .range([3*(lineHeight + chartPadding), 3*(lineHeight + chartPadding) + 13, 3*(lineHeight + chartPadding), 2*(lineHeight + chartPadding), (lineHeight + chartPadding), 0]);

  };
}