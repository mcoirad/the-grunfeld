---
layout: default
---

{% assign executive = site.executives | where: 'name', page.name | first %}


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
  <div class="row">
    <div class="col-md-3">
      <h3> {{ executive.draft_rating_grade}}</h3>
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