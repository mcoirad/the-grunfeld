---
layout: default
---

{% assign executive = site.executives | where: 'href', page.href | first %}

<head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://d3js.org/d3.v5.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/luxon/3.4.4/luxon.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-adapter-luxon/0.2.1/chartjs-adapter-luxon.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/3.0.1/chartjs-plugin-annotation.min.js"></script>

  </head>

<header class="masthead">
    <!-- <div class="overlay"></div> -->
    
    <div class="container">
        <div class="row">
        <div class="col-md-3"></div>
        <div class="col-md-6">
            <div class="page-heading">
            <button class="btn btn-primary" id="toggle-stat">Switch to VORP</button>

            <!-- 
                <img class="w-50 p-3" src="../assets/img/headshots/{{ executive.href }}.png" >
                <h1>{{ page.name }}</h1>
                <h2>{{ page.position }}</h2>
                <h3 class="post-subtitle">
                    {% for team in executive.team  %}
                    {{team}}{% if forloop.last %}{% else %}, {% endif %}
                    {% endfor %}
                </h3>-->
            </div>
            </div>
            <div class="col-md-3"></div>
            
            
        </div>
        
    </div>
    

    
</header>
{% comment %}
{% include executive.md executive=executive %}
            {{ content }}
{% assign exec_data = site.data[executive.href] %}
{% endcomment %}


    <div class="container">
        <div class="row">
        <div class="col-md-3">
          <img class="w-100 p-3" src="../assets/img/headshots/{{ executive.href }}.png" >
                <h1>{{ page.name }}</h1>
                <h2>{{ page.position }}</h2>
                <h3 class="post-subtitle">
                    {% for team in executive.team  %}
                    {{team}}{% if forloop.last %}{% else %}, {% endif %}
                    {% endfor %}
                </h3>
        </div>
        <div class="col-md-9">
    <div class="col-md-12 chart-container" style="height: 10vh; min-height: 450px;">
          <h1 style=" text-align:center;" >Transaction <span class="stat-text" data-vorp-text="VORP" data-bpm-text="BPM">BPM</span> over Tenure</h1>
          <canvas id="executiveTenure"></canvas></div></div></div>
        </div>

<!-- <script type="module" src="dimensions.js"></script> -->
<script>

function toggleStatElements(stat) {
  const showId = `${stat}-toggle`;
  const hideId = stat === 'vorp' ? 'bpm-toggle' : 'vorp-toggle';

   const showElems = document.querySelectorAll(`#${showId}`);
  const hideElems = document.querySelectorAll(`#${hideId}`);

  showElems.forEach(el => el.hidden = false);
  hideElems.forEach(el => el.hidden = true);
}
  
  
let myChart = null;
let rawData = [];
let currentStat = "bpm";
document.getElementById("toggle-stat").addEventListener("click", () => {
    currentStat = currentStat === 'vorp' ? 'bpm' : 'vorp';
    document.getElementById("toggle-stat").innerText = `Switch to ${currentStat === 'vorp' ? 'BPM' : 'VORP'}`;
    updateChart();
    updateTexts();
    updateDraftChart();
    updateExecDraftPlayersChart();
    updateSigningChart();
    updateTradeChart();
    toggleStatElements(currentStat); 

});

// Load the dataset
d3.csv("https://raw.githubusercontent.com/mcoirad/the-grunfeld/master/_data/{{ executive.href }}.csv").then(data => {
    rawData = data;
    makeChart();
});

function roundToTwo(num) {
    return Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100;
}

function getMappedData(stat) {
    const valueKey = `value_${stat}`;
    const singleKey = `single_value_${stat}`;
    const radiiModifier = stat == 'bpm' ? 0.01 : 20; 
    console.log(radiiModifier);

    const scoreData = rawData.map(d => roundToTwo(d[valueKey]));
    const tooltipData = rawData.map(d => {
        const val = parseFloat(d[singleKey]);
        const sign = val < 0 ? '' : '+';
        return `${d.Transaction}: ${sign}${roundToTwo(val)}`;
    });

    const valueMax = Math.max(...rawData.map(d => Math.abs(parseFloat(d[singleKey]))));

    const pointRadii = rawData.map(d => Math.sqrt(Math.abs(d[singleKey]) * radiiModifier));
    const pointColors = rawData.map(d => {
        const val = parseFloat(d[singleKey]);
        const lightness = Math.max((Math.abs(val) / valueMax * -50) + 100, 55);
        const hue = val < 0 ? 0 : 204;
        return `hsla(${hue}, 100%, ${lightness}%, 0.5)`;
    });

    return { scoreData, tooltipData, pointRadii, pointColors };
}

function makeChart() {
    const dateLabels = rawData.map(d => d.date.slice(0, 10));
    const { scoreData, tooltipData, pointRadii, pointColors } = getMappedData(currentStat);

    const ctx = document.getElementById('executiveTenure').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: [{
                label: `Executive Value (${currentStat.toUpperCase()})`,
                data: scoreData,
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                pointRadius: pointRadii,
                pointHoverBackgroundColor: 'black',
                pointHoverRadius: pointRadii,
                pointBackgroundColor: pointColors
            }]
        },
        options: {
            //responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        round: 'day',
                        displayFormats: {
                            day: 'MMM yyyy',
                            month: 'MMM yyyy'
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: '{{ executive.name }}'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return getMappedData(currentStat).tooltipData[context.dataIndex];
                        }
                    }
                },
                annotation: {
                    annotations: {
                        line: {
                            type: 'line',
                            yMin: 0,
                            yMax: 0,
                            borderWidth: 2,
                            borderColor: 'gray'
                        }
                    }
                }
            },
            hover: {
                mode: 'nearest',
                intersect: false
            }
        }
    });
}

function updateChart() {
    const { scoreData, tooltipData, pointRadii, pointColors } = getMappedData(currentStat);

    myChart.data.datasets[0].data = scoreData;
    myChart.data.datasets[0].pointRadius = pointRadii;
    myChart.data.datasets[0].pointHoverRadius = pointRadii;
    myChart.data.datasets[0].pointBackgroundColor = pointColors;
    myChart.data.datasets[0].label = `Executive Value (${currentStat.toUpperCase()})`;

    myChart.options.plugins.tooltip.callbacks.label = function(context) {
        return tooltipData[context.dataIndex];
    };

    myChart.update();
}

function updateTexts() {
    document.querySelectorAll(".stat-text").forEach(el => {
        el.textContent = el.dataset[`${currentStat.toLowerCase()}Text`];
    });
}
updateTexts();
  
</script>
<br>
<br>
<hr>
<hr>

<div class="container">
  <div class="row">
    <h1 class="alert alert-dark" style=" text-align:center;">Grade Report</h1>
    
    <div class="col-md-3">
      <h3> Draft Rating:</h3>
      <p class="stat-text" style="font-family: 'OldEnglish';font-size: calc(4rem + 4vw);" data-vorp-text={{ executive.draft_overall_grade_vorp | default: "n/a" }} data-bpm-text={{ executive.draft_overall_grade_bpm | default: "n/a" }}> {{ executive.draft_overall_grade_bpm | default: "n/a" }}</p>
      <h5 > Draft Pick Efficiency Rating: <span class="stat-text" data-vorp-text={{ executive.draft_rating_percentile_vorp | default: "n/a" }} data-bpm-text={{ executive.draft_rating_percentile_bpm | default: "n/a"  }}><span> {{ executive.draft_rating_percentile_bpm | default: "n/a"}} </h5>
      <h5> Draft Total Value Rating: <span class="stat-text" data-vorp-text={{ executive.draft_total_percentile_vorp | default: "n/a" }} data-bpm-text={{ executive.draft_total_percentile_bpm | default: "n/a" }}><span> {{ executive.draft_total_percentile_bpm | default: "n/a"}}  </h5>
    </div>
    <div class="col-md-9">
    <div class="row">
    <div class="col-md-12 chart-container" style="height: 40vh; min-height: 350px;"><canvas id="executive_draft_chart"></canvas></div>
    </div>
    <hr>

    {% include executive_draft_chart.html exec_name=page.name exec_href=page.href %}
    <div class="row"><div class="col-md-12" style="height: 40vh; min-height: 350px;"><canvas id="executive_draft_players_chart"></canvas></div></div>
    {% include executive_draft_players_chart.html exec_name=page.name exec_href=page.href %}
      {{ executive.draft_description}}
      {{ executive.draft_win_list}}
      {{ executive.draft_bust_list}}

    </div>
  </div>
</div>
<hr>

<div class="container">
  <div class="row">
    <div class="col-md-3">
      <h3> Trade Rating:</h3>
      <p class="stat-text" style="font-family: 'OldEnglish';font-size: calc(4rem + 4vw);" data-vorp-text={{ executive.trade_overall_grade_vorp | default: "n/a" }} data-bpm-text={{ executive.trade_overall_grade_bpm | default: "n/a" }}> {{ executive.trade_overall_grade_bpm | default: "n/a" }}</p>
      <h5 > Trade Efficiency Rating: <span class="stat-text" data-vorp-text={{ executive.trade_rating_percentile_vorp | default: "n/a" }} data-bpm-text={{ executive.trade_rating_percentile_bpm | default: "n/a"  }}><span> {{ executive.trade_rating_percentile_bpm | default: "n/a"}} </h5> 
      <h5> Trade Total Value Rating: <span class="stat-text" data-vorp-text={{ executive.trade_total_percentile_vorp | default: "n/a" }} data-bpm-text={{ executive.trade_total_percentile_bpm | default: "n/a" }}><span> {{ executive.trade_total_percentile_bpm | default: "n/a"}}  </h5>
    </div>

    <div class="col-md-9">
    <div class="row">
    <div class="col-md-12 chart-container" style="height: 40vh; min-height: 350px;"><canvas id="executive_trade_chart"></canvas></div>
    </div>
    {% include executive_trade_chart.html exec_name=page.name exec_href=page.href %}
      {{ executive.trade_description}}
      {{ executive.trade_win_list}}
      {{ executive.trade_lose_list}}
    </div>
  </div>
</div>
<hr>

<div class="container">
  <div class="row">
    <div class="col-md-3">
      <h3> Signing Rating:</h3>
      <p class="stat-text" style="font-family: 'OldEnglish';font-size: calc(4rem + 4vw);" data-vorp-text={{ executive.signing_overall_grade_vorp | default: "n/a" }} data-bpm-text={{ executive.signing_overall_grade_bpm | default: "n/a" }}> {{ executive.signing_overall_grade_bpm | default: "n/a" }}</p>
      <h5 > Signing Efficiency Rating: <span class="stat-text" data-vorp-text={{ executive.signing_rating_percentile_vorp | default: "n/a" }} data-bpm-text={{ executive.signing_rating_percentile_bpm | default: "n/a"  }}><span> {{ executive.signing_rating_percentile_bpm | default: "n/a"}} </h5> 
      <h5> Signing Total Value Rating: <span class="stat-text" data-vorp-text={{ executive.signing_total_percentile_vorp | default: "n/a" }} data-bpm-text={{ executive.signing_total_percentile_bpm | default: "n/a" }}><span> {{ executive.signing_total_percentile_bpm | default: "n/a"}}  </h5>
    </div>
    <div class="col-md-9">
    <div class="row">
    <div class="col-md-12 chart-container" style="height: 40vh; min-height: 350px;"><canvas id="executive_signing_chart"></canvas></div>
    </div>
    {% include executive_signing_chart.html exec_name=page.name exec_href=page.href %}
      {{ executive.signing_description}}
      {{ executive.signing_win_list}}
      {{ executive.signing_lose_list}}
    </div>
  </div>
</div>
<hr>
  

<div class="container">
<table class="table table-striped">
  {% for row in exec_data %}
    {% if forloop.first %}
    <tr>
      {% for pair in row %}
        <th>{{ pair[0] }}</th>
      {% endfor %}
    </tr>
    {% endif %}

    {% tablerow pair in row %}
      {{ pair[1] }}
    {% endtablerow %}
  {% endfor %}
</table>
</div>
<script>
toggleStatElements(currentStat); 
  </script>