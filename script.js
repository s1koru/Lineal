const margin = { top: 10, right: 100, bottom: 40, left: 50 },
      width = 600,
      height = 400 - margin.top - margin.bottom,
      zoneWidth = 200;

const yearCenters = { 2021: 100, 2022: 300, 2023: 500 };

const xScale = d3.scaleLinear()
  .domain([0, 600])
  .range([0, 600]);

const yScale = d3.scaleLinear()
  .domain([0, 400])
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
  .attr("transform", `translate(0, ${height})`)
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

function randomSalary() {
  const r = Math.random();
  if (r < 0.20) {
    return 1 + Math.floor(Math.random() * 40);
  } else if (r < 0.50) {
    return 40 + Math.floor(Math.random() * 21);
  } else if (r < 0.75) {
    return 60 + Math.floor(Math.random() * 41);
  } else if (r < 0.85) {
    const kMin = Math.ceil((100 - 3) / 4);
    const kMax = Math.floor((200 - 3) / 4);
    const k = kMin + Math.floor(Math.random() * (kMax - kMin + 1));
    return 4 * k + 3;
  } else if (r < 0.95) {
    const kMin = Math.ceil((200 - 3) / 4);
    const kMax = Math.floor((300 - 3) / 4);
    const k = kMin + Math.floor(Math.random() * (kMax - kMin + 1));
    return 4 * k + 3;
  } else {
    const kMin = Math.ceil((300 - 3) / 4);
    const kMax = Math.floor((400 - 3) / 4);
    const k = kMin + Math.floor(Math.random() * (kMax - kMin + 1));
    return 4 * k + 3;
  }
}

function generateRealisticData(n) {
  const genders = ["Male", "Female"];
  const educations = ["Среднее", "Высшее", "Другое"];
  const parentals = ["HE", "No HE", "No info"];
  const years = [2021, 2022, 2023];
  const data = [];
  for (let i = 0; i < n; i++) {
    const edu = educations[Math.floor(Math.random() * educations.length)];
    let eduLevel;
    if (edu === "Среднее") { eduLevel = 1; }
    else if (edu === "Другое") { eduLevel = 2; }
    else if (edu === "Высшее") { eduLevel = 3; }
    const year = years[Math.floor(Math.random() * years.length)];
    const salary = randomSalary();
    data.push({
      id: i,
      year: year,
      salary: salary,
      gender: genders[Math.floor(Math.random() * genders.length)],
      education: edu,
      eduLevel: eduLevel,
      parental: parentals[Math.floor(Math.random() * parentals.length)]
    });
  }
  return data;
}

let globalData = generateRealisticData(4000);

function getSelectedFilters(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

function updateChart() {
  const selectedGenders = getSelectedFilters('.filter-gender');
  const selectedEducations = getSelectedFilters('.filter-education');
  const selectedParentals = getSelectedFilters('.filter-parental');

  const filteredData = globalData.filter(d =>
    selectedGenders.includes(d.gender) &&
    selectedEducations.includes(d.education) &&
    selectedParentals.includes(d.parental)
  );

  const dataByYear = d3.group(filteredData, d => d.year);

  const maleColorScale = d3.scaleLinear()
      .domain([1, 2, 3])
      .range(["#A8D0E6", "#4B9CD3", "#0A3B5F"]);
  const femaleColorScale = d3.scaleLinear()
      .domain([1, 2, 3])
      .range(["#FAD4D4", "#F7A4B2", "#A83232"]);

  let pointsData = [];
  dataByYear.forEach((points, year) => {
    const salaryGroups = Array.from(d3.group(points, d => d.salary));
    salaryGroups.sort((a, b) => +a[0] - +b[0]);
    const center = yearCenters[year];
    const zoneStart = center - zoneWidth / 2;
    salaryGroups.forEach(group => {
      const groupPoints = group[1];
      groupPoints.sort((a, b) => a.eduLevel - b.eduLevel);
      const count = groupPoints.length;
      groupPoints.forEach((d, j) => {
        d.x = zoneStart + (j + 0.5) * (zoneWidth / count);
        d.y = yScale(d.salary);
        d.color = d.gender === "Male" ? maleColorScale(d.eduLevel) : femaleColorScale(d.eduLevel);
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
      tooltip.style("opacity", 1)
        .html(`<div><strong>Год:</strong> ${d.year}</div>
               <div><strong>Зарплата:</strong> ${d.salary} тыс. руб.</div>
               <div><strong>Образование:</strong> ${d.education} (ур. ${d.eduLevel})</div>
               <div><strong>Пол:</strong> ${d.gender}</div>`)
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
    return { year: year, avg: yearData.length ? d3.mean(yearData, d => d.salary) : 0 };
  });

  const avgPointsSel = avgGroup.selectAll(".avg-point").data(averages, d => d.year);
  avgPointsSel.exit().remove();
  const avgPointsEnter = avgPointsSel.enter()
    .append("circle")
    .attr("class", "avg-point")
    .attr("r", 3)
    .attr("fill", "#2ECC71");
  const avgPointsMerged = avgPointsEnter.merge(avgPointsSel);
  
  avgPointsMerged
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<div><strong>Среднее значение за ${d.year}:</strong> ${d.avg.toFixed(1)} тыс. руб.</div>`)
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
  
  avgPointsMerged
    .transition()
    .duration(500)
    .attr("cx", d => yearCenters[d.year])
    .attr("cy", d => yScale(d.avg));

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
  .forEach(el => el.addEventListener('change', updateChart));

updateChart();
