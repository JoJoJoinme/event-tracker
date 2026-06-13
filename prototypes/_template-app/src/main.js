import "./styles.css";
import { mockCards } from "./data/mock-data.js";

const params = new URLSearchParams(window.location.search);
const state = {
  prototype: "_template-app",
  stage: "P1-structured-static-app",
  runtime: "vite",
  mode: params.get("mode") || "mock",
  debug: params.get("debug") === "1",
  lastAction: "initial-render"
};

function renderCards() {
  return mockCards
    .map(
      (card) => `
        <article class="card">
          <strong>${card.title}</strong>
          <p>${card.body}</p>
        </article>
      `
    )
    .join("");
}

function renderDebug() {
  if (!state.debug) return "";
  return `<pre class="debug visible">${JSON.stringify(state, null, 2)}</pre>`;
}

function render() {
  document.querySelector("#app").innerHTML = `
    <main>
      <section class="hero">
        <strong>P1 structured static app</strong>
        <h1>App Prototype Template</h1>
        <p>Use this template after a P0 prototype is accepted and needs a maintainable project structure.</p>
      </section>
      <section class="panel">
        <h2>Mock output</h2>
        <div class="cards">${renderCards()}</div>
      </section>
      ${renderDebug()}
    </main>
  `;
}

render();
