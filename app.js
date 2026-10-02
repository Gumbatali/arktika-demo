import { roles, crises, equipment } from './data.js';
import { fresh, validRun, totals, score, investments, stepSummary } from './game.js';
const KEY = 'arktika-laboratory-v2';
let run = fresh(), history = [], storageAvailable = true, selected = -1, loadMessage = '';
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (validRun(saved.run) && Array.isArray(saved.history) && saved.history.length <= 20 && saved.history.every((x, i, list) => validRun(x) && x.phase === 'final' && (i === 0 || x.crewId > list[i - 1].crewId))) {
      run = saved.run; history = saved.history;
    } else loadMessage = 'Сохранение повреждено. Начата новая экспедиция.';
  }
} catch { storageAvailable = false; }
const mission = document.querySelector('#mission');
const dialog = document.querySelector('#reset-dialog');
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ run, history })); }
  catch { storageAvailable = false; }
}
const action = (label, name, cls = '') => `<button class="primary wide ${cls}" data-action="${name}">${label}</button>`;
const notice = () => '<div id="feedback" class="feedback" role="status" aria-live="polite"></div>';
function layout(label, content) {
  return `${!storageAvailable ? '<div class="save-warning">Прогресс не сохраняется: хранилище браузера недоступно.</div>' : ''}${loadMessage ? `<div class="save-warning">${loadMessage}</div>` : ''}<div class="step-line"><span class="pill">${label}</span><span class="step-count">${run.phase === 'start' ? 'ЭКСПЕДИЦИЯ / 01' : `УЧАСТОК ${run.round + 1} ИЗ 3`}</span></div>${content}`;
}
function feedback(text) { document.querySelector('#feedback').textContent = text; }
function summaryHTML(round) {
  const s = stepSummary(run, round);
  return `<div class="step-summary"><strong>Итоги этапа ${round + 1}</strong><p>Заработано: ${s.earned} куб. · Потрачено: ${s.spent} куб. · Баланс после этапа: ${s.wallet} куб.</p><p>Рейтинг: ${s.before} → ${s.after} (+${s.change}: ${s.earned} за решения и ${s.upgrade} за оборудование).</p><ul>${crises[round].questions.map((q, role) => `<li>${roles[role].name}: ${q.skill}</li>`).join('')}</ul><small>Навыки разобраны в экспедиции. Степень освоения отмечена в оценке каждого решения.</small></div>`;
}
function renderJournal() {
  const visited = run.phase === 'start' ? 0 : run.round + 1;
  const complete = ['summary', 'final'].includes(run.phase) ? run.round + 1 : run.round;
  const phases = { start: 'Ожидание старта', drift: 'Дрейф', problem: 'Проблема и решения', review: 'Разбор решений', shop: 'Прокачка', summary: 'Запись итогов', final: 'Финал' };
  document.querySelector('#journal-count').textContent = `${run.answers.length} записей о навыках`;
  document.querySelector('#bc-status').textContent = `БК: ${phases[run.phase]} · этап ${run.phase === 'start' ? 0 : run.round + 1} / 3 · до финала: ${3 - complete}`;
  document.querySelector('#journal-body').innerHTML =
    `<h3>Маршрут и проблемы</h3>${visited ? crises.slice(0, visited).map((c, i) => `<p class="drift-entry">Этап ${i + 1} / 3 · позиция: ${c.place}. Доступная проблема: «${c.title}». На момент прибытия до финала: ${3 - i} этапа, включая этот.</p>`).join('') : '<p class="description">БК ожидает начала дрейфа.</p>'}` +
    `<h3>Решения и навыки</h3>${run.answers.length ? crises.slice(0, Math.ceil(run.answers.length / 3)).map((c, round) => `<section class="journal-round"><h3>${round + 1}. ${c.title}</h3>${c.questions.slice(0, Math.min(3, run.answers.length - round * 3)).map((q, role) => {
      const choice = q.choices[run.answers[round * 3 + role]];
      return `<article><strong>${roles[role].icon} ${roles[role].name} · ${choice[1]} / 9</strong><p><b>Решение:</b> ${choice[0]}</p><p>${choice[2]}</p><p><b>Разобранный навык:</b> ${q.skill}</p><small>Начислено: ${choice[1]} куб. · ${choice[1] === 9 ? 'Задача решена полно' : 'Стоит повторить: решение учитывает не все условия'}</small></article>`;
    }).join('')}</section>`).join('') : '<p class="description">Каждое подтверждённое решение сразу появится здесь вместе с оценкой и начислением.</p>'}` +
    `<section class="investments"><h3>Инвестиции в оборудование</h3>${run.purchases.length ? investments(run).map(p => `<article>Этап ${p.round + 1} · ${equipment[p.item].name}, уровень ${p.level}: ${equipment[p.item].levels[p.level - 1]}.<br><b>Списано ${p.cost} куб. → +${p.points} балла рейтинга.</b></article>`).join('') : '<p class="description">Пока без вложений.</p>'}</section>` +
    `<section class="step-summaries"><h3>Итоговые записи по этапам</h3>${complete ? Array.from({ length: complete }, (_, i) => summaryHTML(i)).join('') : '<p class="description">Итоговая запись появится после завершения прокачки на этапе.</p>'}</section>`;
}
function render(focus = false) {
  selected = -1;
  const t = totals(run), c = crises[run.round];
  document.querySelector('#wallet').textContent = t.wallet;
  document.querySelector('#rating').textContent = t.rating;
  document.querySelector('#route-progress').textContent = `${Math.floor(run.answers.length / 3)} / 3`;
  document.querySelector('#cargo-count').textContent = `Улучшений: ${run.purchases.length} / 9`;
  document.querySelector('#cargo-slots').innerHTML = equipment.map((e, i) => `<div class="cargo-slot ${t.levels[i] ? 'found' : ''}"><span class="module-icon" aria-hidden="true">${e.icon}</span><div><strong>${e.name}</strong><small>Уровень ${t.levels[i]} / 3 · ${t.levels[i] ? e.levels[t.levels[i] - 1] : 'Базовое оборудование'}</small></div></div>`).join('');
  document.querySelector('#location').textContent = run.phase === 'start' ? '● Лаборатория готова к дрейфу' : `● ${c.place}${run.phase === 'final' ? ' · финиш' : ''}`;
  const points = ['240 470', '185 259', '382 170', '575 330'];
  document.querySelector('#rover').setAttribute('transform', `translate(${points[run.phase === 'start' ? 0 : run.round + 1]})`);
  document.querySelectorAll('.map-node').forEach((el, i) => {
    el.classList.toggle('done', (i + 1) * 3 <= run.answers.length);
    el.classList.toggle('active', run.phase !== 'start' && i === run.round);
  });
  renderJournal();
  if (run.phase === 'start') {
    mission.innerHTML = layout('ПЛАВАЮЩАЯ ЛАБОРАТОРИЯ', `<h2>Вся научная команда —<br>под твоим управлением</h2><p class="description">Добро пожаловать на борт «Горизонта»! Пройди маршрут СМП, справься с тремя кризисами и развивай лабораторию.</p><div class="passport">${roles.map(r => `<article><strong>${r.icon} ${r.name}</strong><p>${r.task}</p></article>`).join('')}</div><div class="briefing"><strong>Дрейф → проблема → 3 решения → прокачка → запись</strong>В каждом кризисе ответь за всех специалистов. У каждого — четыре варианта. Ответ приносит 3, 6 или 9 кубитов; выбранное решение нельзя переиграть в этой экспедиции.</div>${action('Начать экспедицию →', 'start', 'lime')}<p class="subcaption">Кубиты здесь — игровая валюта, а не реальные квантовые биты.</p>`);
  } else if (run.phase === 'drift') {
    mission.innerHTML = layout('ДРЕЙФ ПО СМП', `<div class="discovery" aria-hidden="true">≋</div><h2>${c.place}</h2><p class="description">Лаборатория перемещается к следующей точке маршрута. БК фиксирует позицию и доступную проблему. До финала: ${3 - run.round} этапа, включая текущий.</p><div class="briefing"><strong>${c.title}</strong>${c.story}</div><div class="intro-steps">${roles.map(r => `<span><b>${r.icon}</b>${r.person} готов${r.person === 'Лев' ? '' : 'а'} к работе</span>`).join('')}</div>${action('Разобрать кризис →', 'problem')}`);
  } else if (run.phase === 'problem') {
    const role = run.answers.length % 3, r = roles[role], q = c.questions[role];
    mission.innerHTML = layout(`КРИЗИС ${run.round + 1} / СПЕЦИАЛИСТ ${role + 1} ИЗ 3`, `<h2>${c.title}</h2><details class="context" open><summary>Обстановка экспедиции</summary><p>${c.story}</p></details><div class="crew"><span class="avatar" aria-hidden="true">${r.icon}</span><div><strong>${r.name}</strong><small>${r.person} · ${role + 1}-е решение команды</small></div></div><p class="question">${q.prompt}</p><div class="options">${q.choices.map((x, i) => `<button class="option" data-action="select" data-index="${i}" aria-pressed="false"><strong><span>${i + 1}. ${x[0]}</span></strong></button>`).join('')}</div>${notice()}${action('Зафиксировать решение →', 'answer')}<p class="subcaption">3 — слабое решение · 6 — частичное · 9 — полное</p>`);
  } else if (run.phase === 'review') {
    const roundScore = score(run.answers) - score(run.answers.slice(0, run.round * 3));
    mission.innerHTML = layout('КРИЗИС ПРОЙДЕН', `<h2>Три решения.<br>Одна команда.</h2><div class="reward">+${roundScore} <span>кубитов за кризис</span></div><p class="description">Все три решения уже записаны в БК. Кубиты начислялись сразу после каждого ответа; эта сводка не начисляет их повторно.</p><div class="passport">${c.questions.map((q, i) => { const a = q.choices[run.answers[run.round * 3 + i]]; return `<article><strong>${roles[i].icon} ${roles[i].name} · +${a[1]}</strong><p>${a[2]}</p></article>`; }).join('')}</div>${action('Улучшить лабораторию →', 'shop')}`);
  } else if (run.phase === 'shop') {
    mission.innerHTML = layout('ПРОКАЧКА ЛАБОРАТОРИИ', `<h2>Инвестируй<br>в науку</h2><p class="description">Каждый комплекс улучшается трижды. Уровень 1: <b>3 кубита → 2 балла</b>; уровень 2: <b>6 → 4</b>; уровень 3: <b>9 → 6</b>. Покупки увеличивают рейтинг и уровень лаборатории.</p><div class="shop-items">${equipment.map((e, i) => { const level = t.levels[i], cost = (level + 1) * 3; return `<article class="shop-item"><strong>${e.icon} ${e.name}</strong><p>${level < 3 ? e.levels[level] : 'Комплекс полностью оснащён'}</p><button class="secondary" data-action="buy" data-index="${i}" ${level === 3 || cost > t.wallet ? 'disabled' : ''}>${level === 3 ? 'Максимальный уровень' : `Купить уровень ${level + 1}: ${cost} куб. / +${(level + 1) * 2} балла`}</button>${level < 3 && cost > t.wallet ? `<small>Не хватает ${cost - t.wallet} куб.</small>` : ''}</article>`; }).join('')}</div>${notice()}${action('Записать итоги этапа →', 'depart')}<p class="subcaption">Можно сохранить кубиты для следующего участка. Остаток в финале отдельно не добавляет баллы.</p>`);
  } else if (run.phase === 'summary') {
    mission.innerHTML = layout('ЗАПИСЬ В БОРТОВОЙ КОМПЬЮТЕР', `<h2>Этап ${run.round + 1} записан</h2><p class="description">Решения и инвестиции объединены в итоговую запись. До финала осталось этапов: ${2 - run.round}.</p>${summaryHTML(run.round)}${action(run.round === 2 ? 'Завершить экспедицию →' : 'Продолжить дрейф →', 'continue')}`);
  } else {
    const ranking = history.map(h => ({ number: h.crewId, ...totals(h) })).sort((a, b) => b.rating - a.rating || a.number - b.number);
    mission.innerHTML = layout('ЭКСПЕДИЦИЯ ЗАВЕРШЕНА', `<h2>Маршрут пройден.<br>Наука — на борту!</h2><div class="reward">${t.rating}<span>итоговый рейтинг команды</span></div><div class="briefing"><strong>${t.earned} за решения + ${t.upgrade} за оборудование = ${t.rating}</strong>Заработано: ${t.earned} куб. · Потрачено: ${t.spent} куб. · Остаток: ${t.wallet} куб. Покупки не вычитаются из баллов за решения.</div><div class="passport">${roles.map((r, i) => `<article><strong>${r.icon} ${r.name}</strong><p>${crises.reduce((sum, c, round) => sum + c.questions[i].choices[run.answers[round * 3 + i]][1], 0)} / 27 за решения. ${r.task}</p><p>${r.quantum}</p></article>`).join('')}</div><details class="ranking" open><summary>Рейтинг экипажей на этом устройстве</summary><p class="subcaption">Последние 20 завершённых экспедиций. Игроки могут проходить игру по очереди.</p><ol>${ranking.map(x => `<li>Экипаж ${x.number}${x.number === run.crewId ? ' (эта экспедиция)' : ''}<b>${x.rating} баллов</b></li>`).join('')}</ol></details>${action('Новая экспедиция ↺', 'restart', 'lime')}<p class="subcaption">Все девять записей о навыках — в бортовом компьютере ниже.</p>`);
  }
  if (focus) { mission.focus({ preventScroll: true }); if (matchMedia('(max-width:720px)').matches) mission.scrollIntoView({ block: 'start', behavior: 'instant' }); }
}
mission.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  const name = button.dataset.action, index = Number(button.dataset.index);
  if (name === 'restart') return dialog.showModal();
  if (name === 'select' && run.phase === 'problem') {
    selected = index;
    mission.querySelectorAll('.option').forEach(el => { const on = Number(el.dataset.index) === index; el.classList.toggle('selected', on); el.setAttribute('aria-pressed', String(on)); });
    return feedback('Вариант выбран. Подтверди, чтобы записать решение.');
  }
  if (name === 'start' && run.phase === 'start') run.phase = 'drift';
  else if (name === 'problem' && run.phase === 'drift') run.phase = 'problem';
  else if (name === 'answer' && run.phase === 'problem') {
    if (selected < 0) return feedback('Сначала выбери один из четырёх вариантов.');
    run.answers.push(selected);
    const answerNumber = run.answers.length - 1;
    const choice = crises[run.round].questions[answerNumber % 3].choices[selected];
    if (run.answers.length % 3 === 0) run.phase = 'review';
    save(); render(true);
    if (run.phase === 'problem') feedback(`БК записал решение: +${choice[1]} куб. ${choice[2]} Теперь отвечает следующий специалист.`);
    return;
  } else if (name === 'shop' && run.phase === 'review') run.phase = 'shop';
  else if (name === 'buy' && run.phase === 'shop') {
    const t = totals(run), level = t.levels[index];
    if (level === undefined || level >= 3 || t.wallet < (level + 1) * 3) return;
    run.purchases.push({ item: index, round: run.round });
    save(); render();
    const next = mission.querySelector(`[data-action="buy"][data-index="${index}"]`);
    (next.disabled ? mission : next).focus({ preventScroll: true });
    return feedback(`Улучшение установлено. +${(level + 1) * 2} балла к рейтингу.`);
  } else if (name === 'depart' && run.phase === 'shop') {
    run.phase = 'summary';
  } else if (name === 'continue' && run.phase === 'summary') {
    if (run.round < 2) { run.round++; run.phase = 'drift'; }
    else { run.phase = 'final'; run.crewId = (history.at(-1)?.crewId || 0) + 1; history.push(structuredClone(run)); history = history.slice(-20); }
  } else return;
  save(); render(true);
});
document.querySelector('#reset').addEventListener('click', () => dialog.showModal());
document.querySelector('#cancel-reset').addEventListener('click', () => dialog.close());
document.querySelector('#confirm-reset').addEventListener('click', () => { run = fresh(); loadMessage = ''; save(); dialog.close(); render(true); });
render();
