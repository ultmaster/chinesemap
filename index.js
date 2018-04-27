let chineseMapView = $('#view1');
chineseMapView.height(chineseMapView.width() * 0.6);

let economyView = $('#view2');
economyView.height(economyView.width() * 0.2);

let lineChartView = $('#view3');
lineChartView.height(lineChartView.width() * 0.5);

let tip1 = d3.select("#tip1");
let tip2 = d3.select("#tip2");

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
  afterUpdateSettings();
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

function afterUpdateSettings() {
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

  // shadow def
  let defs = svg.append("defs");
  let filter = defs.append("filter")
    .attr("id", "dropshadow");
  filter.append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", 4)
    .attr("result", "blur");
  filter.append("feOffset")
    .attr("in", "blur")
    .attr("dx", 2)
    .attr("dy", 2)
    .attr("result", "offsetBlur");
  let feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode")
    .attr("in", "offsetBlur");
  feMerge.append("feMergeNode")
    .attr("in", "SourceGraphic");

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
    .attr("stroke-width", function (d) {
      if (settings.region === d.properties.name)
        return 2;
      else return 0.5;
    })
    .attr("fill", getRegionColor)
    .attr("d", path)
    .style("z-index", function (d) {
      if (settings.region === d.properties.name)
        return 2;
      else return 0;
    })
    .on("mouseover", function (d, i) {
      tip1.transition()
        .duration(500)
        .style("opacity", .6)
        .style("font-size", 20);
      tip1.html(d.properties.name + ": " + densityData[d.properties.name])
        .style("left", (d3.event.pageX - 60) + "px")
        .style("top", (d3.event.pageY - 60) + "px");
    })
    .on("mousemove", function (d, i) {
      tip1.html(d.properties.name + ": " + densityData[d.properties.name])
        .style("left", (d3.event.pageX - 60) + "px")
        .style("top", (d3.event.pageY - 60) + "px");
    })
    .on("mouseout", function (d, i) {
      tip1.transition()
        .duration(500)
        .style("opacity", 0);
    })
    .on("click", function (d, i) {
      settings.region = d.properties.name;
      afterUpdateSettings();
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

  function showTooltip (d, i) {
    tip2.style("font-size", 12)
      .style("width", "150px")
      .style("height", "50px");
    tip2.transition()
      .duration(50)
      .style("opacity", .6);
    tip2.html(d.region + "<br>" + d.val + " / " + Math.round(d.gdp))
      .style("left", (d3.event.pageX - 60) + "px")
      .style("top", (d3.event.pageY - 60) + "px");
  }

  function hideTooltip (d, i) {
    tip2.transition()
      .duration(500)
      .style("opacity", 0);
  }

  g.append("g").selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("fill", function (d) {
      return d.region === settings.region ? color(0.2) : color(0.4);
    })
    .attr("x", function (d) { return x(d.region); })
    .attr("y", function (d) { return y1(d.val); })
    .attr("height", function (d) { return y1Max - y1(d.val); })
    .attr("width", x.bandwidth())
    .on("mouseover", showTooltip)
    .on("mouseout", hideTooltip)
    .on("click", function (d, i) {
      settings.region = d.region;
      afterUpdateSettings();
    });

  g.append("g").selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("fill", function (d) {
      return d.region === settings.region ? color(1) : color(0.7);
    })
    .attr("x", function (d) { return x(d.region); })
    .attr("y", height / 2)
    .attr("height", function (d) { return y2(d.gdp); })
    .attr("width", x.bandwidth())
    .on("mouseover", showTooltip)
    .on("mouseout", hideTooltip)
    .on("click", function (d, i) {
      settings.region = d.region;
      afterUpdateSettings();
    });

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
  let xAxis = d3.axisBottom(xScale).tickFormat(function (d) {
    return "" + d;
  });
  let xAxisWithoutTick = d3.axisBottom(xScale).tickFormat("");

  svg.append("text").attr("class", "text-year")
    .attr("dx", lineWidth)
    .attr("dy", height - 10)
    .attr("text-anchor", "end")
    .attr("fill", "#777")
    .attr("opacity", 0.4)
    .style("font-size", 100)
    .on("show", function () {
      let event = d3.event;
      if (event.detail.hasOwnProperty("year"))
        d3.select(this).text(event.detail.year);
      else d3.select(this).text("");
    });

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
      .selectAll("circle").data(function (d) {
      return d.data;
    }).enter().append("circle")
      .attr("class", "line-chart-circle")
      .attr("cx", function (d, i) {
        return xScale(i + 2007)
      })
      .attr("cy", function (d) {
        return yScale(d);
      })
      .attr("fill", function (d) {
        return colorSchemeScale(d3.select(this.parentNode).datum().name)(0.8);
      })
      .attr("opacity", 0)
      .attr("r", 3.5)
      .on("show", function (d, i) {
        let event = d3.event;
        if (event.detail.index === i)
          d3.select(this).attr("opacity", 0.8);
        else d3.select(this).attr("opacity", 0);
      })
      .on("disappear", function () {
        // d3.select(this).attr("opacity", 0);
      });
    // add axis
    let axisGroup = svg.append("g").attr("transform", "translate(0," + ((i + 1) * (lineHeight + paddingHeight)) + ")");
    axisGroup.call(i + 1 === groupType.length ? xAxis : xAxisWithoutTick);
  }

  // build text
  let textGroup = svg.append("g").attr("width", textWidth).attr("height", height)
    .attr("transform", "translate(" + (width - textWidth) + ",0)");
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
      d3.selectAll(".text-year").dispatch("show", {
        detail: {
          year: idx + 2007
        }
      });
    })
    .on('mouseout', function (d) {
      interactiveLineWrap.attr('opacity', 0);
      d3.selectAll(".line-chart-circle").dispatch("disappear");
    });
}