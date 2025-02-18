// Устанавливаем размеры графика (общий размер 640x400)
const margin = { top: 10, right: 100, bottom: 40, left: 50 },
      width = 640 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

// Создаём SVG-элемент внутри #chart
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Определяем шкалы
const xScale = d3.scaleLinear()
  .domain([2020.5, 2023.5]) // немного увеличенный диапазон
  .range([0, width]);

const yScale = d3.scaleLinear()
  .domain([0, 110]) 
  .range([height, 0]);

// Создаём оси
const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(3);
const yAxis = d3.axisLeft(yScale).ticks(10);

// Добавляем оси
svg.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0, ${height})`)
  .call(xAxis);

svg.append("g")
  .attr("class", "y-axis")
  .call(yAxis);

// Подписи осей
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

// Элемент для линии тренда
const trendLine = svg.append("path").attr("class", "trend-line");

// Группа для точек на линии тренда
const trendPoints = svg.append("g").attr("class", "trend-points");

// Элемент для tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Глобальная переменная для данных
let globalData = [];

// Функция генерации случайных данных
function generateRandomData(n) {
  const genders = ["Male", "Female"];
  const educations = ["Среднее", "Высшее", "Другое"];
  const parentals = ["HE", "No HE", "No info"];
  const years = [2021, 2022, 2023];
  const data = [];
  for (let i = 0; i < n; i++) {
    data.push({
      id: i,
      year: years[Math.floor(Math.random() * years.length)],
      salary: Math.random() * (100 - 5) + 5,
      gender: genders[Math.floor(Math.random() * genders.length)],
      education: educations[Math.floor(Math.random() * educations.length)],
      parental: parentals[Math.floor(Math.random() * parentals.length)]
    });
  }
  return data;
}

// Генерируем 1000 точек
globalData = generateRandomData(15);

// Функция получения выбранных фильтров
function getSelectedFilters(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

// Функция обновления графика
function updateChart() {
  const selectedGenders = getSelectedFilters('.filter-gender');
  const selectedEducations = getSelectedFilters('.filter-education');
  const selectedParentals = getSelectedFilters('.filter-parental');

  // Фильтруем данные
  const filteredData = globalData.filter(d =>
    selectedGenders.includes(d.gender) &&
    selectedEducations.includes(d.education) &&
    selectedParentals.includes(d.parental)
  );

  // Определяем цвет линии и точек в зависимости от выбранного пола
  let lineColor = "#2ECC71"; // зелёный для обоих полов
  if (selectedGenders.length === 1) {
    lineColor = selectedGenders.includes("Female") ? "#F7A4B2" : "#4B9CD3";
  }

  // Рассчитываем среднее значение зарплаты по годам
  const years = [2021, 2022, 2023];
  const averages = years.map(year => {
    const yearData = filteredData.filter(d => d.year === year);
    return { year: year, avg: yearData.length ? d3.mean(yearData, d => d.salary) : 0 };
  });

  // Генерируем линию тренда
  const lineGenerator = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.avg))
    .curve(d3.curveMonotoneX);

  trendLine.datum(averages)
    .transition()
    .duration(500)
    .attr("d", lineGenerator)
    .style("stroke", lineColor)
    .style("stroke-width", 2)
    .style("fill", "none");

  // Обновляем точки на линии тренда (с изменением цвета)
  const points = trendPoints.selectAll(".trend-point").data(averages);

  points.exit().remove();

  points.enter()
    .append("circle")
    .attr("class", "trend-point")
    .attr("r", 4)
    .merge(points)
    .transition()
    .duration(500)
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.avg))
    .attr("fill", lineColor); // обновляем цвет точек

  // Добавляем tooltip при наведении на точки
  trendPoints.selectAll(".trend-point")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<div><strong>Год:</strong> ${d.year}</div>
               <div><strong>Средняя зарплата:</strong> ${d.avg.toFixed(1)} тыс. руб.</div>`)
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
}

// Вешаем обработчики событий на фильтры
document.querySelectorAll('.filter-gender, .filter-education, .filter-parental')
  .forEach(el => el.addEventListener('change', updateChart));

// Первоначальное обновление графика
updateChart();
