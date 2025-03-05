const margin = { top: 10, right: 100, bottom: 40, left: 50 },
      width = 600,
      height = 400 - margin.top - margin.bottom,
      zoneWidth = 200;

const yearCenters = { 2021: 100, 2022: 300, 2023: 500 };

const xScale = d3.scaleLinear()
  .domain([0, 600])
  .range([0, 600]);

const yScale = d3.scaleLinear()
  .domain([0, 250])
  .range([height, 0]);

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xAxis = d3.axisBottom(xScale)
  .tickValues([100, 300, 500])
  .tickFormat(d => {
    if (d === 100) return "2021";
    if (d === 300) return "2022";
    if (d === 500) return "2023";
    return "";
  });

const yAxis = d3.axisLeft(yScale).ticks(10);

svg.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${height})`)
  .call(xAxis);

svg.append("g")
  .attr("class", "y-axis")
  .call(yAxis);

svg.append("text")
  .attr("class", "x-axis-label")
  .attr("text-anchor", "middle")
  .attr("x", width / 2)
  .attr("y", height + margin.bottom - 10)
  .text("Год");

svg.append("text")
  .attr("class", "y-axis-label")
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", -margin.left + 15)
  .text("Зарплата (тыс. руб.)");

svg.append("line")
  .attr("x1", 200)
  .attr("y1", 0)
  .attr("x2", 200)
  .attr("y2", height)
  .attr("stroke", "black")
  .attr("stroke-dasharray", "4,4");

svg.append("line")
  .attr("x1", 400)
  .attr("y1", 0)
  .attr("x2", 400)
  .attr("y2", height)
  .attr("stroke", "black")
  .attr("stroke-dasharray", "4,4");

const pointsGroup = svg.append("g").attr("class", "points-group");
const avgGroup = svg.append("g").attr("class", "avg-group");

const avgTrendLine = svg.append("path")
  .attr("class", "avg-trend")
  .attr("fill", "none")
  .attr("stroke", "#2ECC71")
  .attr("stroke-width", 2);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

const maleColorScale = d3.scaleLinear()
  .domain([1, 2, 3, 4, 5])
  .range([
    "#C4DAED",
    "#8BBADF",
    "#4B9CD3",
    "#3379A6",
    "#1F4B70"
  ]);

const femaleColorScale = d3.scaleLinear()
  .domain([1, 2, 3, 4, 5])
  .range([
    "#FDD6DF",
    "#FBBECB",
    "#F7A4B2",
    "#D46E77",
    "#A83232"
  ]);

let globalData = [];

function fetchAllData() {
  d3.json("data.json").then(data => {
    globalData = data.map(d => {
      return d;
    });
    updateChart();
  })
  .catch(error => console.error("Ошибка загрузки data.json:", error));
}

function getSelectedFilters(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

function educationLabel(code) {
  switch(code) {
    case "1": return "9 класс";
    case "2": return "11 класс";
    case "3": return "Среднее проф.";
    case "4": return "Высшее";
    case "5": return "Другое";
    default: return code;
  }
}

function parentalLabel(code) {
  switch(code) {
    case "1": return "Высшее";
    case "2": return "Нет высшего";
    case "3": return "Нет информации";
    default: return code;
  }
}

function updateChart() {
  const selectedGenders = getSelectedFilters('.filter-gender');
  const selectedEducations = getSelectedFilters('.filter-education');
  const selectedParentals = getSelectedFilters('.filter-parental');

  const filteredData = globalData.filter(d =>
    selectedGenders.includes(d.gender) &&
    selectedEducations.includes(d.education) &&
    selectedParentals.includes(d.parental) &&
    d.salary <= 250000
  );

  if (filteredData.length === 0) {
    pointsGroup.selectAll("circle").remove();
    avgGroup.selectAll(".avg-point").remove();
    avgTrendLine.attr("d", "");
    return;
  }

  svg.select(".y-axis")
    .transition()
    .duration(500)
    .call(yAxis);

  const dataByYear = d3.group(filteredData, d => d.year);
  let pointsData = [];

  dataByYear.forEach((points, year) => {
    const salaryGroups = Array.from(d3.group(points, d => d.salary));
    salaryGroups.sort((a, b) => +a[0] - +b[0]);
    const center = yearCenters[year];
    const zoneStart = center - zoneWidth / 2;

    salaryGroups.forEach(group => {
      const groupPoints = group[1];
      const count = groupPoints.length;
      const groupCenter = zoneStart + zoneWidth / 2;

      groupPoints.forEach((d, j) => {
        d.x = groupCenter + (j - (count - 1) / 2) * 4.05;
        d.y = yScale(Math.round(d.salary / 1000));
        d.color = d.gender === "Male"
          ? maleColorScale(+d.education)
          : femaleColorScale(+d.education);
        pointsData.push(d);
      });
    });
  });

  const points = pointsGroup.selectAll(".data-point").data(pointsData, d => d.id);
  points.exit().remove();

  points.enter()
    .append("circle")
    .attr("class", "data-point")
    .attr("r", 2)
    .merge(points)
    .transition()
    .duration(500)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("fill", d => d.color);

  pointsGroup.selectAll(".data-point")
    .on("mouseover", (event, d) => {
      const genderRus = d.gender === "Male" ? "Мужской" : "Женский";
      tooltip.style("opacity", 1)
        .html(`<div><strong>Год:</strong> ${d.year}</div>
               <div><strong>Зарплата:</strong> ${Math.round(d.salary / 1000)} тыс. руб.</div>
               <div><strong>Образование:</strong> ${educationLabel(d.education)}</div>
               <div><strong>Образование родителей:</strong> ${parentalLabel(d.parental)}</div>
               <div><strong>Пол:</strong> ${genderRus}</div>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  const yearsArr = [2021, 2022, 2023];
  const averages = yearsArr.map(year => {
    const yearData = filteredData.filter(d => d.year === year);
    return {
      year: year,
      avg: yearData.length ? Math.round(d3.mean(yearData, d => d.salary / 1000)) : 0
    };
  });

  const avgPointsSel = avgGroup.selectAll(".avg-point").data(averages, d => d.year);
  avgPointsSel.exit().remove();

  avgPointsSel.enter()
    .append("circle")
    .attr("class", "avg-point")
    .attr("r", 3)
    .attr("fill", "#2ECC71")
    .merge(avgPointsSel)
    .transition()
    .duration(500)
    .attr("cx", d => yearCenters[d.year])
    .attr("cy", d => yScale(d.avg));

  avgGroup.selectAll(".avg-point")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<div><strong>Среднее за ${d.year}:</strong> ${d.avg} тыс. руб.</div>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  const avgLine = d3.line()
    .x(d => yearCenters[d.year])
    .y(d => yScale(d.avg))
    .curve(d3.curveMonotoneX);

  avgTrendLine
    .transition()
    .duration(500)
    .attr("d", avgLine(averages));
}

document.querySelectorAll('.filter-gender, .filter-education, .filter-parental')
  .forEach(el => el.addEventListener('change', () => {
    updateChart();
  }));

fetchAllData();
