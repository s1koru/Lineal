const margin = { top: 10, right: 100, bottom: 40, left: 50 },
      width = 600,
      height = 400 - margin.top - margin.bottom,
      zoneWidth = 200;

const yearCenters = { 2021: 100, 2022: 300, 2023: 500 };

const xScale = d3.scaleLinear()
  .domain([0, 600])
  .range([0, 600]);

// Фиксируем ось Y от 0 до 450 (тыс. руб.)
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
    "#C4DAED", // (1) немного ярче светлый голубой
    "#8BBADF", // (2) промежуточный
    "#4B9CD3", // (3) базовый цвет
    "#3379A6", // (4) промежуточный между базовым и тёмным
    "#1F4B70"  // (5) тёмно-синий
  ]);

// Женщины
const femaleColorScale = d3.scaleLinear()
  .domain([1, 2, 3, 4, 5])
  .range([
    "#FDD6DF", // (1) чуть ярче светло-розовый
    "#FBBECB", // (2) промежуточный
    "#F7A4B2", // (3) базовый цвет
    "#D46E77", // (4) промежуточный
    "#A83232"  // (5) более тёмный насыщенный
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


// Функция получения выбранных фильтров из чекбоксов
function getSelectedFilters(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

// Метки образования
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

/**
 * Основная функция отрисовки графика:
 * - Фильтрует данные по полу, образованию, родительскому образованию
 * - Показывает точки зарплат до 450 тыс. руб.
 * - Раскладывает их по горизонтали, рисует tooltip и линию тренда
 */
function updateChart() {
  const selectedGenders = getSelectedFilters('.filter-gender');
  const selectedEducations = getSelectedFilters('.filter-education');
  const selectedParentals = getSelectedFilters('.filter-parental');

  // Фильтрация: salary <= 450000
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

  // Ось Y фиксирована (0..450)
  svg.select(".y-axis")
    .transition()
    .duration(500)
    .call(yAxis);

  // Группируем данные по году
  const dataByYear = d3.group(filteredData, d => d.year);
  let pointsData = [];

  dataByYear.forEach((points, year) => {
    // Группируем по зарплате, чтобы разложить точки с одинаковой зарплатой
    const salaryGroups = Array.from(d3.group(points, d => d.salary));
    salaryGroups.sort((a, b) => +a[0] - +b[0]);
    const center = yearCenters[year];
    const zoneStart = center - zoneWidth / 2;

    salaryGroups.forEach(group => {
      const groupPoints = group[1];
      const count = groupPoints.length;
      const groupCenter = zoneStart + zoneWidth / 2;

      groupPoints.forEach((d, j) => {
        // Увеличенное расстояние между точками: ×8
        d.x = groupCenter + (j - (count - 1) / 2) * 4.05;
        // Переводим зарплату в тыс. и округляем
        d.y = yScale(Math.round(d.salary / 1000));
        // Цвет точек: градиент по образованию + учёт пола
        d.color = d.gender === "Male"
          ? maleColorScale(+d.education)
          : femaleColorScale(+d.education);

        pointsData.push(d);
      });
    });
  });

  /*dataByYear.forEach((points, year) => {
    // Группируем по зарплате, чтобы разложить точки с одинаковой зарплатой
    const salaryGroups = Array.from(d3.group(points, d => d.salary));
    salaryGroups.sort((a, b) => +a[0] - +b[0]);
    const center = yearCenters[year];
    const zoneStart = center - zoneWidth / 2;
  
    salaryGroups.forEach(group => {
      const groupPoints = group[1];
      // Сортируем точки с одинаковой зарплатой по образованию:
      // значения "1" (9 класс) будут первыми, затем "2", "3", и т.д.
      groupPoints.sort((a, b) => +a.education - +b.education);
      
      const count = groupPoints.length;
      const groupCenter = zoneStart + zoneWidth / 2;
  
      groupPoints.forEach((d, j) => {
        // Увеличенное расстояние между точками: множитель 8
        d.x = groupCenter + (j - (count - 1) / 2) * 4.05;
        // Переводим зарплату в тыс. руб. и округляем
        d.y = yScale(Math.round(d.salary / 1000));
        // Цвет точек: градиент по образованию с учётом пола
        d.color = d.gender === "Male"
          ? maleColorScale(+d.education)
          : femaleColorScale(+d.education);
  
        pointsData.push(d);
      });
    });
  });*/
  
  // Рисуем точки
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

  // Tooltip
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

  // Средние значения по годам (в тыс. руб.)
  const yearsArr = [2021, 2022, 2023];
  const averages = yearsArr.map(year => {
    const yearData = filteredData.filter(d => d.year === year);
    return {
      year: year,
      avg: yearData.length ? Math.round(d3.mean(yearData, d => d.salary / 1000)) : 0
    };
  });

  // Точки для средних
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

  // Tooltip для средних
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

  // Линия тренда средних
  const avgLine = d3.line()
    .x(d => yearCenters[d.year])
    .y(d => yScale(d.avg))
    .curve(d3.curveMonotoneX);

  avgTrendLine
    .transition()
    .duration(500)
    .attr("d", avgLine(averages));
}

// Ставим обработчики на чекбоксы (пол, образование, родительское образование)
document.querySelectorAll('.filter-gender, .filter-education, .filter-parental')
  .forEach(el => el.addEventListener('change', () => {
    updateChart();
  }));

// Сразу загружаем локальные данные и строим график
fetchAllData();
