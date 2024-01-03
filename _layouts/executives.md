---
layout: default
---

{% assign executive = site.executives | where: 'name', page.name | first %}

<head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://d3js.org/d3.v5.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/luxon/3.4.4/luxon.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-adapter-luxon/0.2.1/chartjs-adapter-luxon.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/3.0.1/chartjs-plugin-annotation.min.js"></script>

  </head>

<header class="masthead">
    <div class="overlay"></div>
    <div class="container">
        <div class="row">
            <div class="page-heading">
                <img src="../assets/img/headshots/{{ executive.href }}.png" >
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

{% comment %}
{% include executive.md executive=executive %}
            {{ content }}
{% assign exec_data = site.data[executive.href] %}
{% endcomment %}


    <div class="container">
        <div class="row">
          <h1 style=" text-align:center;">Transaction BPM over Tenure</h1>
          <canvas id="executiveTenure"></canvas></div></div>

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
      var plusSign = '+';
      if (d.single_value < 0){
        plusSign = '';
      } 
      return d.Transaction + ': ' + plusSign + d.single_value;
    });
    var pointRadii = exec_data.map(function(d) {
      return Math.sqrt(Math.abs(d.single_value) / 100);
    });
    var valueMin = Math.min(...exec_data.map(function(d) {
      return parseInt(d.single_value);
    }));
    var valueMax = Math.max(...exec_data.map(function(d) {
      return Math.abs(parseInt(d.single_value));
    }));
    var pointColors = exec_data.map(function(d) {
      var lightness = Math.max(( (Math.abs(d.single_value) / valueMax ) * -50) + 100, 55);
      var hue = 204;
      if (d.single_value < 0) {
        hue = 0;
      };
      return "hsla(" + hue + ", 100%, " + lightness + "%, 0.5)";
    });
    
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
            pointHoverBackgroundColor: 'black',
            pointHoverRadius: pointRadii,
            pointBackgroundColor: pointColors
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
        },
      }
      
    });
    console.log("hello");
  }
  
</script>
<hr>
<hr>
<div class="container">
  <div class="row">
    <h1 style=" text-align:center;">Grade Report</h1>
    
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