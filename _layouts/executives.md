---
layout: default
---

{% assign executive = site.executives | where: 'name', page.name | first %}

<head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://d3js.org/d3.v5.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/luxon/3.4.4/luxon.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-adapter-luxon/0.2.1/chartjs-adapter-luxon.min.js"></script>
  </head>

<header class="masthead">
    <div class="overlay"></div>
    <div class="container">
        <div class="row">
            <div class="page-heading">
                <h1>{{ page.name }}</h1>
                <h2>{{ page.position }}</h2>
                <h3 class="post-subtitle">
                    {% for team in executive.team  %}
                    {{team}}{% if forloop.last %}{% else %}, {% endif %}
                    {% endfor %}
                </h3>
            </div>
            
        </div>
        
    </div>
    
</header>

{% include executive.md executive=executive %}
            {{ content }}
{% assign exec_data = site.data[executive.href] %}

    <div class="container">
        <div class="row"><canvas id="executiveTenure"></canvas></div></div>

<!-- <script type="module" src="dimensions.js"></script> -->
<script>
  
  // Load the dataset
  d3.csv("https://raw.githubusercontent.com/mcoirad/the-grunfeld/master/_data/{{ executive.href }}.csv").then(makeChart);
  
  function makeChart(exec_data) {
    
    var dateLabels = exec_data.map(function (d) {
      return d.date.slice(0, 10);
    });
    var scoreData = exec_data.map(function (d) {
      return d.value;
    });
    var tooltipData = exec_data.map(function (d) {
      return d.Transaction + ': ' + d.single_value;
    });
    var pointRadii = exec_data.map(function(d) {
      return Math.sqrt(Math.abs(d.single_value) / 100);
    })
    
    
    const config = {
      
    };
    

    const myChart = new Chart('executiveTenure', {
      data: {
        labels: dateLabels,
          datasets: [{
            label: 'My First Dataset',
            data: scoreData,
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            pointRadius:  pointRadii,
            pointHoverBackgroundColor: 'red',
            pointHoverRadius: pointRadii
          }]
      },
      type: 'line',
      options: {
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
          },
          
        },
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: '{{ executive.name }}'
          },
          tooltip: {
            callbacks: {
                label: function(context) {
                    return tooltipData[ context.dataIndex];
                }
            },
            mode: 'nearest',
            intersect: false,
          }
        },
        hover: {
          mode: 'nearest',
          intersect: false
        },
      }
      
    });
    console.log("hello");
  }
  
</script>

<div class="container">
  <div class="row">
    <div class="col-md-3">
      <h3> Draft Rating:</h3>
      <p style="font-family: 'OldEnglish';font-size: calc(4rem + 4vw);"> {{ executive.draft_rating_grade}}</h3>
    </div>
    <div class="col-md-9">
      {{ executive.draft_description}}
      <h5>Some of their biggest wins:</h5>
      {{ executive.draft_win_list}}
      <h5>Some of their biggest busts:</h5>
      {{ executive.draft_bust_list}}
    </div>
  </div>
</div>
<hr>

<div class="container">
  <div class="row">
    <div class="col-md-3">
      <h3> Trade Rating:</h3>
      <p style="font-family: 'OldEnglish';font-size: calc(4rem + 4vw);"> {{ executive.trade_rating_grade}}</h3>
    </div>
    <div class="col-md-9">
      {{ executive.trade_description}}
      <h5>Their biggest win:</h5>
      {{ executive.trade_win_list}}
      <h5>Their biggest L:</h5>
      {{ executive.trade_lose_list}}
    </div>
  </div>
</div>
<hr>

<div class="container">
  <div class="row">
    <div class="col-md-3">
      <h3> Signing Rating:</h3>
      <p style="font-family: 'OldEnglish';font-size: calc(4rem + 4vw);"> {{ executive.signing_rating_grade}}</h3>
    </div>
    <div class="col-md-9">
      {{ executive.signing_description}}
      <h5>Their best signings:</h5>
      {{ executive.signing_win_list}}
      <h5>Their worst signings:</h5>
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