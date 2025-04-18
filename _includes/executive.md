{% assign executive = include.executive %}
{% assign shortcode = executive.team_shortcode %}
<div class="container">
  <div class="row">
    <div class="col-lg-3">
      <article class="post-preview">
        <a>
          <h2 class="post-title">Rank: {{ executive.bpm_rank }}</h3>
        </a>
        <img src="../assets/img/headshots/{{ executive.href }}.png" class="img-fluid w-100" style="outline: thick solid #000;">
        <!-- <img src="../assets/img/logos/{{ executive.team_shortcode | last | downcase }}.png" class="img-fluid w-100" style="outline: thick solid #000;"> -->
        <div class="position-absolute bottom-0 text-light" style="background-color: rgba(0, 0, 0, 0.5)">
          <!-- <h3 class="p-2 m-0">Rank: {{ executive.bpm_rank }}</h3> -->
        </div>
      </article>
    </div>
    <div class="col-lg-9">
      <article class="post-preview">
        <a href="{{ executive.url | prepend: site.baseurl | replace: '//', '/' }}">
          <h2 class="post-title">{{ executive.name }}</h2>
          <h3 class="post-subtitle">
            {% for team in executive.team  %}
            {{team}}{% if forloop.last %}{% else %}, {% endif %}
            {% endfor %}
          </h3>
        </a>
        <p class="post-meta">Tenure: 
          {{ executive.start_year }} -
          {% if executive.end_year %}
          {{ executive.end_year }}
          {% else %}
          present
          {% endif %}
          &middot; Points: {{ executive.final_bpm }}
        </p>
        

      <!--<div class="accordion" id="accordionExample{{ name_clean }}">
          <div class="accordion-item">
            <h2 class="accordion-header" id="headingOne{{ name_clean }}">
              <button
                class="accordion-button"
                type="button"
                data-mdb-toggle="collapse"
                data-mdb-target="#collapseOne{{ name_clean }}"
                aria-expanded="true"
                aria-controls="collapseOne{{ name_clean }}"
              >
                Read Full Analysis
              </button>
            </h2>
            <div id="collapseOne{{ name_clean }}" class="accordion-collapse collapse" aria-labelledby="headingOne{{ name_clean }}" data-mdb-parent="#accordionExample{{ name_clean }}">
              <div class="accordion-body">
                {{ executive.content }}
              </div>
            </div>
          </div>
          
        </div> -->
      </article>
      <img src="../assets/img/preview_plots/{{ executive.href }}.png" class="img-fluid w-100">
      
    </div>
  </div>
  <div class="row">
    <div class="col-md-3">
      <div class="row">
            <div class="col-md-3">
              Draft
            </div>
            <div class="col-md-3">
              Trade 
            </div>
            <div class="col-md-3">
              Signing
            </div>
            
          </div>
      <div class="row">
            <div class="col-md-3">
              <h3> {{ executive.draft_rating_grade_vorp}}</h3>
            </div>
            <div class="col-md-3">
              <h3>{{ executive.trade_rating_grade_vorp}}</h3>
            </div>
            <div class="col-md-3">
              <h3> {{ executive.signing_rating_grade_vorp}}</h3>
            </div>
            
            
      </div>
    </div>
    <div class="col-md-9">
     <div class="row">
      {% if executive.badges contains "shark" %}
          <div class="col-md-2">
            <h1>🦈</h1>
            <p>shark</p>
          </div>
          {% endif %}
          {% if executive.badges contains "rebuilder" %}
          <div class="col-md-2">
            <h1>🚧</h1>
            <p>rebuilder</p>
          </div>
          {% endif %}
          {% if executive.badges contains "smallmarket" %}
          <div class="col-md-2">
            <h1>🧑‍🌾</h1>
            <p>small market</p>
          </div>
          {% endif %}
          {% if executive.badges contains "godfather" %}
          <div class="col-md-2">
            <h1>🤵🏻</h1>
            <span>godfather</span>
          </div>
          {% endif %}
          {% if executive.badges contains "superteam" %}
          <div class="col-md-2">
            <h1>🦸</h1>
            <p>superteam</p>
          </div>
          {% endif %}
          {% if executive.badges contains "destination" %}
          <div class="col-md-2">
            <h1>🏖️</h1>
            <p>destination</p>
          </div>
          {% endif %}
          {% if executive.badges contains "gambler" %}
          <div class="col-md-2">
            <h1>🎰️</h1>
            <p>gambler</p>
          </div>
          {% endif %}
          {% if executive.badges contains "lucky" %}
          <div class="col-md-2">
            <h1>🍀️</h1>
            <p>lucky</p>
          </div>
          {% endif %}
          {% if executive.badges contains "noob" %}
          <div class="col-md-2">
            <h1>🤓️</h1>
            <p>noob</p>
          </div>
          {% endif %}
          {% if executive.badges contains "greatdrafter" %}
          <div class="col-md-2">
            <h1>🕵️️</h1>
            <p>great drafter</p>
          </div>
          {% endif %}
          {% if executive.badges contains "champion" %}
          <div class="col-md-2">
            <h1>👑️️</h1>
            <p>champion</p>
          </div>
          {% endif %}
          {% if executive.badges contains "squanderer" %}
          <div class="col-md-2">
            <h1>💔️️</h1>
            <p>talent squanderer</p>
          </div>
          {% endif %}
          {% if executive.badges contains "mediocre" %}
          <div class="col-md-2">
            <h1>😐️️</h1>
            <p>middling</p>
          </div>
          {% endif %}
          {% if executive.badges contains "badluck" %}
          <div class="col-md-2">
            <h1>🐈‍⬛️️</h1>
            <p>unlucky</p>
          </div>
          {% endif %}
          {% if executive.badges contains "tanker" %}
          <div class="col-md-2">
            <h1>🚆️</h1>
            <p>tanker</p>
          </div>
          {% endif %}
          {% if executive.badges contains "baddrafter" %}
          <div class="col-md-2">
            <h1>🤡️</h1>
            <p>bad drafter</p>
          </div>
          {% endif %}
          {% if executive.badges contains "optimizer" %}
          <div class="col-md-2">
            <h1>🖩️</h1>
            <p>optimizer</p>
          </div>
          {% endif %}
          </div>
    </div>
  </div>
        
</div>