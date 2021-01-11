import React, { Component } from 'react';
import './app.css';
import ReactImage from './react.png';

const WATCH_STATUS_TO_STRING = {
  1: "Watching",
  2: "Watched",
  3: "On Hold",
  4: "Dropped",
  6: "Plan to Watch"
};

const WATCH_STATUS_TO_STYLE = {
  1: "ws-watching",
  2: "ws-watched",
  3: "ws-on-hold",
  4: "ws-dropped",
  6: "ws-ptw"
};

const MAL_ID_TO_TITLE = {

};

export default class App extends Component {

  state = { 
    progress: 0,
    progressMax: 0,
    resultStatus: 0, // 0 = nothing searched yet, 1 = loading, 2 = results gotten
    animeLists: null,
    animesSorted: null,
    seasonals: [ ],
    errors: [ ],
    resultCount: 100
  };

  sorted = { };

  componentDidMount() {
    fetch('https://api.jikan.moe/v3/season')
      .then(res => res.json())
      .then(data => {
        this.updateState({
          seasonals: data.anime.map(x => x.mal_id)
        });
      });

    this.sortAnimes = this.sortAnimes.bind(this);
    this.rateAnime = this.rateAnime.bind(this);
    this.updateState = this.updateState.bind(this);
    this.search = this.search.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.rateAnime = this.rateAnime.bind(this);
    this.loadMore = this.loadMore.bind(this);
    this.loadAll = this.loadAll.bind(this);

    const searchParams = new URLSearchParams(window.location.search);
    let names = searchParams.get("names");

    if(names) {
      // names = names.split(",").map(x => x.trim()).filter(x => x != "");

      this.search(this.namesFromString(names));
    }
  }

  namesFromString(nameStr) {
    const tmp = nameStr.split(",").map(x => x.trim()).filter(x => x != "").join(" ");
    return tmp.split(" ").map(x => x.trim()).filter(x => x != "");
  }

  updateState(newStates) {
    let s = {
      ...this.state,
      ...newStates
    };

    this.setState(s);
  }

  loadAll() {
    this.updateState({
      resultCount: 9999
    });
  }

  onSearch(e) {
    if(e.key != "Enter") return;
    if(this.state.resultStatus == 1) return;

    let names = this.namesFromString(e.target.value);
    // .split(",");
    // names = names.map(x => x.trim());
    // names = names.filter(x => x != "");

    // names = names.slice(0, 10);

    // console.log(names);

    this.search(names);
  }

  loadMore() {
    this.updateState({
      resultCount: this.state.resultCount + 100
    });
  }

  search(queue) {
    
    this.sorted = { };

    // const searchParams = new URLSearchParams(window.location.search);
    // searchParams.set("names", queue.join(","));

    this.setState({
      resultStatus: 1,
      animeLists: null,
      animesSorted: null,
      progress: 0,
      progressMax: queue.length,
      errors: [ ],
      resultCount: 100
    });

    let animeLists = [ ];
    let interval = setInterval(() => {

      let name = queue.pop();
      let url = `https://api.jikan.moe/v3/user/${name}/animelist`;

      fetch(url)
        .then(res => res.json())
        .then(data => {
          if(data.anime) {
            animeLists.push({ 
              name: name, 
              list: [ ...data.anime ]
            });
          }
          else {
            this.state.errors.push(name);
          }

          this.updateState({
            progress: this.state.progress + 1,
          });

          if(queue.length <= 0 && this.state.progress == this.state.progressMax) {
            clearInterval(interval);
    
            this.updateState({
              animeLists: animeLists.reverse(),
            });
    
            this.state.animeLists = this.state.animeLists.filter(x => x.name);
            // console.log(animeLists);
            this.sortAnimes();

            return;
          }
        });
    }, 1000);
  }

  rateAnime(id) {
    
    if(this.sorted[id])
      return this.sorted[id];

    let score = 0;
    let i = -1;
    let avgScore = 0;
    for (const user of this.state.animeLists) {
      const anime = user.list.find(x => x.mal_id == id);

      i++;
      if(!anime) {
        continue;
      }

      score += 0.1 * (this.state.animeLists.length - i - 1);

      MAL_ID_TO_TITLE[id] = anime.title;

      // if(anime.watching_status == 6) {
      //   // score += 0.5;
      //   // avgScore += 0.09 * (anime.score / 3);
      //   continue;
      // }

      if(anime.watching_status == 1) {
        score += 2.5;
        avgScore += 0.09 * (anime.score / this.state.animeLists.length);
        continue;
      }

      if(anime.watching_status == 2) {
        score += 3;
        avgScore += 0.09 * (anime.score / this.state.animeLists.length);
        continue;
      }
    }

    score += avgScore;
    this.sorted[id] = score;
    return score;
  }

  sortAnimes() {
    let allAnimes = new Set();
    for (const user of this.state.animeLists) {
      allAnimes = new Set([...allAnimes, ...(user.list.map(x => x.mal_id))]);
    }

    let animesSorted = [ ...allAnimes ];
    animesSorted = animesSorted.sort((a, b) => this.rateAnime(b) - this.rateAnime(a));
    
    this.updateState({
      animesSorted: animesSorted,
      resultStatus: 2
    });

    // console.log(animesSorted);
  }

  render() {
    let searchParams = new URLSearchParams(window.location.search);
    let names = searchParams.get("names");

    if(names)
      names = this.namesFromString(names);

    let shareLink;
    if(this.state.resultStatus == 2) {
      searchParams = new URLSearchParams(window.location.search);
      searchParams.set("names", this.state.animeLists.map(x => x.name).join(","));

      shareLink = location.protocol + '//' + location.host + location.pathname + "?" + searchParams.toString();
      
    }

    let count = 0;
    // console.log(this.state.animeLists);
    return (
      <div className="centered app">
        <div className="centered info">
          <div className="centered search-area">
            <p className="subtle search-help">Enter a list of usernames separated by commas. For example: <code>not_bot_mark, layzer3, nashdashin</code></p>
            <input type="text" defaultValue={names? names.join(", ") : ""} className="username-list" onKeyDown={(e) => this.onSearch(e)}></input>
            {this.state.resultStatus == 2? 
              <p className="subtle search-help">To share these results, share the following link:<br></br><code>{shareLink}</code></p>
              : undefined}
            </div>
          {(this.state.resultStatus == 2 && this.state.errors.length > 0)? <div className="info-section">
            There was a problem fetching the following people's anime lists:
            <ul>
              {this.state.errors.map(x => <li key={x}>{x}</li>)}
            </ul>
            Make sure that there are no typos, and that their anime lists are set to public.
          </div> : undefined}
        </div>
        <div className="centered">
        {
          this.state.resultStatus == 0 ?
            <div>Enter some usernames, then press enter to begin!</div> 
            : this.state.resultStatus == 1 ? 
              <div>Fetching the users' anime lists... Only {this.state.progressMax - this.state.progress} more go!</div> 
              : <div>
                <table border="0" cellSpacing="0">
                  <thead>
                    <tr>
                      <th></th>
                      {this.state.animeLists.map(x => <th key={x.name}>
                        {x.name}
                      </th>)}
                    </tr>
                  </thead>
                  <tbody>
                      {this.state.animesSorted.slice(0, this.state.resultCount).map(animeID => 
                        <tr key={animeID}>
                          <th className="anime-title">{(() => {
                            let anime;
                            for (const user of this.state.animeLists) {
                              anime = user.list.find(x => x.mal_id == animeID);
                              if(anime) break;
                            }
                            count++;
                            return <a href={anime.url} target="_blank">
                              {this.state.seasonals.find(x => x == animeID)? <span className="seasonal">Seasonal</span> : undefined}
                              {anime.title}
                            </a>
                          })()}</th>
                          {this.state.animeLists.map(user => {
                            let anime = user.list.find(x => x.mal_id == animeID);
                            let cell; 

                            if(anime)
                              cell = {
                                text: WATCH_STATUS_TO_STRING[anime.watching_status], 
                                style: WATCH_STATUS_TO_STYLE[anime.watching_status]
                              };
                            else 
                              cell = {
                                text: "",
                                style: "ws-not-interested"
                              };

                            return <th key={user.name + "," + animeID} className={cell.style}>
                              {(anime && anime.score == 10)? <span className="seasonal">★ </span> : ""}{cell.text}
                              {(anime && anime.score > 0)? <span className="score">{anime.score}/10</span> : undefined}
                            </th>
                          })}
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
        }
        </div>
        <div className="centered load-more-area">
          {count == this.state.resultCount? <div>
            <a href="javscript:void()" onClick={this.loadMore}>Load more...</a>&nbsp;&nbsp;&nbsp;&nbsp;
            <a href="javscript:void()" onClick={this.loadAll}>Load all...</a>
          </div> : undefined}
        </div>
      </div>
    );
  }
}
