{% assign executive = include.executive %}
<div class="container">
  <div class="row">
    <div class="col-lg-4">
      <img src="{{ executive.image_url }}" class="img-fluid w-100">
      <div class="position-absolute bottom-0 text-light" style="background-color: rgba(0, 0, 0, 0.5)">
        <h3 class="p-2 m-0">Rank: {{ executive.bpm_rank }}</h3>
      </div>
    </div>
    <div class="col-lg-8">
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
        
        <div class="accordion" id="accordionExample{{ name_clean }}">
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
          
        </div>
      </article>
      
    </div>
  </div>
    <div class="row">
          <div class="col-md-1">
            Draft
          </div>
          <div class="col-md-1">
            Trade 
          </div>
          <div class="col-md-1">
            Transaction 
          </div>
        </div>
  <div class="row">
          <div class="col-md-1">
            <h3> {{ executive.draft_rating_grade}}</h3>
          </div>
          <div class="col-md-1">
            <h3>{{ executive.trade_rating_grade}}</h3>
          </div>
          <div class="col-md-1">
            <h3> {{ executive.transaction_rating_grade}}</h3>
          </div>
        </div>
</div>