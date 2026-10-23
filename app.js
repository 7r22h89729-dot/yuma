document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const home = $("#home-screen");
  const appScreen = $("#app-screen");
  const content = $("#app-content");
  const title = $("#app-title");
  const backButton = $("#back-home");

  if (!home || !appScreen || !content || !title) {
    console.error("앱 화면 요소를 찾을 수 없습니다.");
    return;
  }

  const names = {
    photos: "사진",
    phone: "전화",
    messages: "메시지",
    kakao: "KakaoTalk",
    calendar: "캘린더",
    music: "음악",
    instagram: "Instagram",
    settings: "설정",
    camera: "카메라",
    clock: "시계"
  };

  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("저장할 수 없습니다.", error);
    }
  };

  const escapeHTML = (value) =>
    String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);

  const initialData = window.SIM_DATA || {};

  let messages = read("yumaMessages", initialData.messages || []);
  let kakao = read("yumaKakao", initialData.kakao || []);
  let liked = read("likedPosts", [false, false]);
  let current = "";
  let previousView = null;
  let currentView = null;
  let calendarDate = new Date(2027, 1, 1);
  let clockInterval = null;
  let stopwatchInterval = null;
  let stopwatchSeconds = 0;
  let timerInterval = null;
  let timerSeconds = 0;
  let cameraStream = null;
  let activeAudio = null;

  const uploadedPhotos = () => read("yumaUploadedPhotos", []);
  const callHistory = () => read("yumaCallHistory", []);
  const customEvents = () => read("yumaCalendarEvents", []);

  /* ---------------------------------
     상태 표시줄 시계
  --------------------------------- */

  function updateTime() {
    const now = new Date();

    const time = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    ["#status-time", "#home-time", "#app-time", "#lock-time"]
      .forEach((selector) => {
        const element = $(selector);
        if (element) element.textContent = time;
      });

    const date = $("#lock-date");

    if (date) {
      date.textContent = now.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long"
      });
    }

    const homeDate = $("#home-date");

    if (homeDate && date) {
      homeDate.textContent = date.textContent;
    }
  }

  updateTime();
  setInterval(updateTime, 15000);

  /* ---------------------------------
     앱 실행 및 화면 이동
  --------------------------------- */

  document.querySelectorAll("[data-app]").forEach((button) => {
    button.addEventListener("click", () => {
      openApp(button.dataset.app);
    });
  });

  if (backButton) {
    backButton.addEventListener("click", goHome);
  }

  const homeIndicator = $("#home-indicator");

  if (homeIndicator) {
    homeIndicator.addEventListener("click", goHome);
  }

  function openApp(name) {
    if (!names[name]) return;

    stopCamera();
    stopClockTools();

    current = name;
    previousView = null;
    currentView = null;

    home.classList.add("hidden");
    appScreen.classList.remove("hidden");

    title.textContent = names[name];

    render();
  }

  function goHome() {
    stopCamera();
    stopClockTools();

    appScreen.classList.add("hidden");
    home.classList.remove("hidden");

    current = "";
    previousView = null;
    currentView = null;
  }

  function setTitle(text) {
    title.textContent = text;
  }

  function setView(view) {
    previousView = currentView;
    currentView = view;
  }

  function render() {
    stopCamera();

    switch (current) {
      case "photos":
        renderPhotos();
        break;
      case "phone":
        renderPhone();
        break;
      case "messages":
        renderMessages();
        break;
      case "kakao":
        renderKakao();
        break;
      case "calendar":
        renderCalendar();
        break;
      case "music":
        renderMusic();
        break;
      case "instagram":
        renderInstagram();
        break;
      case "settings":
        renderSettings();
        break;
      case "camera":
        renderCamera();
        break;
      case "clock":
        renderClock();
        break;
    }
  }

  function showTabs(items, active, callback) {
    const tabs = document.createElement("nav");
    tabs.className = "ios-tab-bar";

    items.forEach((item) => {
      const button = document.createElement("button");
      button.className = item.id === active ? "active" : "";
      button.innerHTML = `
        <span class="tab-symbol">${item.icon}</span>
        <span>${escapeHTML(item.label)}</span>
      `;

      button.addEventListener("click", () => callback(item.id));
      tabs.appendChild(button);
    });

    return tabs;
  }

  function card(className = "") {
    const element = document.createElement("section");
    element.className = `ios-card ${className}`.trim();
    return element;
  }

  function heading(text) {
    const element = document.createElement("h2");
    element.className = "ios-section-title";
    element.textContent = text;
    return element;
  }

  function makeButton(text, callback, className = "ios-row") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", callback);
    return button;
  }

  function makeRow(icon, label, detail = "", callback = null) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "ios-list-row";

    row.innerHTML = `
      <span class="ios-row-icon">${icon}</span>
      <span class="ios-row-label">${escapeHTML(label)}</span>
      <span class="ios-row-detail">${escapeHTML(detail)}</span>
      <span class="ios-chevron">›</span>
    `;

    if (callback) {
      row.addEventListener("click", callback);
    } else {
      row.disabled = true;
    }

    return row;
  }

  function makeTabsContent(items, active, callback) {
    const tabs = document.createElement("div");
    tabs.className = "ios-segmented";

    items.forEach((item) => {
      const button = document.createElement("button");
      button.textContent = item.label;
      button.classList.toggle("active", item.id === active);

      button.addEventListener("click", () => callback(item.id));
      tabs.appendChild(button);
    });

    return tabs;
  }

  /* ---------------------------------
     메시지 앱
  --------------------------------- */

  function renderMessages() {
    setTitle("메시지");
    setView("message-list");

    content.innerHTML = "";

    const wrap = card("ios-page");
    wrap.innerHTML = `
      <div class="ios-page-top">
        <span class="ios-muted">메시지</span>
        <button class="ios-text-button" id="new-message">새 메시지</button>
      </div>

      <h2 class="ios-large-title">메시지</h2>

      <input
        class="ios-search"
        id="message-search"
        placeholder="검색"
        autocomplete="off"
      >

      <div id="message-list"></div>
    `;

    content.appendChild(wrap);

    const list = $("#message-list", wrap);

    const conversations = [
      {
        id: "yuma",
        name: "🐱 ユウマ",
        preview: messages.at(-1)?.text || "메시지를 시작해 보세요.",
        icon: "🐱"
      }
    ];

    function drawList(filter = "") {
      list.innerHTML = "";

      conversations
        .filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()))
        .forEach((item) => {
          const row = document.createElement("button");
          row.className = "ios-conversation";

          row.innerHTML = `
            <span class="ios-avatar">${item.icon}</span>
            <span class="ios-conversation-info">
              <strong>${escapeHTML(item.name)}</strong>
              <small>${escapeHTML(item.preview)}</small>
            </span>
            <span class="ios-chevron">›</span>
          `;

          row.addEventListener("click", () => {
            renderChat("messages", item.id);
          });

          list.appendChild(row);
        });
    }

    drawList();

    $("#message-search", wrap).addEventListener("input", (event) => {
      drawList(event.target.value);
    });

    $("#new-message", wrap).addEventListener("click", () => {
      renderChat("messages", "yuma");
    });
  }

  function renderChat(type, person = "yuma") {
    const isKakao = type === "kakao";
    const list = isKakao ? kakao : messages;

    setTitle(isKakao ? "KakaoTalk" : "메시지");
    setView(`${type}-chat`);

    content.innerHTML = `
      <section class="ios-chat-page ${isKakao ? "kakao-chat" : "messages-chat"}">
        <div class="ios-chat-person">
          <span class="ios-avatar">🐱</span>
          <strong>ユウマ</strong>
          <small>가상 대화</small>
        </div>

        <div class="ios-chat-bubbles" id="chat-bubbles"></div>

        <form class="ios-composer" id="chat-form">
          <input
            id="chat-text"
            placeholder="메시지 입력..."
            autocomplete="off"
            maxlength="1000"
          >
          <button type="submit" aria-label="메시지 보내기">↑</button>
        </form>
      </section>
    `;

    const bubbleBox = $("#chat-bubbles");

    function drawBubbles() {
      bubbleBox.innerHTML = "";

      list.forEach((message) => {
        const bubble = document.createElement("div");

        bubble.className =
          "ios-message-bubble " +
          (message.from === "me" ? "mine" : "theirs");

        bubble.textContent = message.text;
        bubbleBox.appendChild(bubble);
      });

      bubbleBox.scrollTop = bubbleBox.scrollHeight;
    }

    drawBubbles();

    $("#chat-form").addEventListener("submit", (event) => {
      event.preventDefault();

      const input = $("#chat-text");
      const text = input.value.trim();

      if (!text) return;

      list.push({
        from: "me",
        text,
        time: new Date().toISOString()
      });

      save(isKakao ? "yumaKakao" : "yumaMessages", list);

      drawBubbles();
      input.value = "";
      input.focus();
    });
  }

  /* ---------------------------------
     카카오톡
  --------------------------------- */

  function renderKakao() {
    setTitle("KakaoTalk");
    setView("kakao-home");

    content.innerHTML = "";

    const page = card("ios-page kakao-page");

    page.innerHTML = `
      <div class="ios-page-top">
        <h2 class="ios-large-title">채팅</h2>
        <span>＋</span>
      </div>

      <input class="ios-search" id="kakao-search" placeholder="이름 또는 채팅 검색">

      <div class="ios-story-list">
        <button class="ios-story" id="kakao-profile">
          <span>🐱</span>
          <small>유마</small>
        </button>
        <button class="ios-story">
          <span>👩🏻</span>
          <small>나나</small>
        </button>
        <button class="ios-story">
          <span>🌷</span>
          <small>민서</small>
        </button>
      </div>

      <div id="kakao-chat-list"></div>
    `;

    content.appendChild(page);

    const chatList = $("#kakao-chat-list", page);

    const friends = [
      ["🐱", "유마", kakao.at(-1)?.text || "대화를 시작해 보세요."],
      ["👩🏻", "나나", "안녕!"],
      ["🌷", "민서", "오늘 뭐 해?"],
      ["❤️", "엄마♥", "밥 먹었니?"],
      ["💙", "아빠♥", "조심히 다녀."]
    ];

    function draw(filter = "") {
      chatList.innerHTML = "";

      friends
        .filter((friend) => friend[1].includes(filter))
        .forEach(([icon, name, preview]) => {
          const row = document.createElement("button");
          row.className = "ios-conversation";

          row.innerHTML = `
            <span class="ios-avatar">${icon}</span>
            <span class="ios-conversation-info">
              <strong>${escapeHTML(name)}</strong>
              <small>${escapeHTML(preview)}</small>
            </span>
            <span class="ios-chevron">›</span>
          `;

          row.addEventListener("click", () => {
            if (name === "유마") {
              renderChat("kakao");
            } else {
              showToast(`${name}과의 대화는 가상 화면입니다.`);
            }
          });

          chatList.appendChild(row);
        });
    }

    draw();

    $("#kakao-search", page).addEventListener("input", (event) => {
      draw(event.target.value);
    });

    $("#kakao-profile", page).addEventListener("click", () => {
      showToast("유마 프로필");
    });

    content.appendChild(
      showTabsContent([
        ["친구", "♙"],
        ["채팅", "▤"],
        ["오픈채팅", "◉"],
        ["더보기", "•••"]
      ], "채팅")
    );
  }

  function showTabsContent(items, active) {
    const tabs = document.createElement("nav");
    tabs.className = "ios-tab-bar";

    items.forEach(([label, icon]) => {
      const button = document.createElement("button");
      button.classList.toggle("active", label === active);
      button.innerHTML = `<span class="tab-symbol">${icon}</span><span>${label}</span>`;
      button.addEventListener("click", () => {
        if (label === "친구") {
          showToast("친구 목록");
        } else if (label === "더보기") {
          showToast("더보기");
        } else if (label === "오픈채팅") {
          showToast("오픈채팅은 준비 중입니다.");
        } else {
          renderKakao();
        }
      });
      tabs.appendChild(button);
    });

    return tabs;
  }

  /* ---------------------------------
     전화 앱
  --------------------------------- */

  function renderPhone(tab = "recent") {
    setTitle("전화");
    setView(`phone-${tab}`);

    content.innerHTML = "";

    const page = card("ios-page phone-page");

    const tabs = [
      { id: "favorites", label: "즐겨찾기", icon: "★" },
      { id: "recent", label: "최근 통화", icon: "◷" },
      { id: "contacts", label: "연락처", icon: "♙" },
      { id: "keypad", label: "키패드", icon: "▦" }
    ];

    page.appendChild(heading(
      tab === "recent" ? "최근 통화" :
      tab === "contacts" ? "연락처" :
      tab === "favorites" ? "즐겨찾기" : "키패드"
    ));

    if (tab === "recent") {
      const list = card();

      const calls = [
        ...callHistory(),
        ...(initialData.phoneCalls || []).map((call) => ({
          name: call[0],
          detail: `${call[1]} · ${call[2]}`
        }))
      ];

      if (calls.length === 0) {
        const empty = document.createElement("p");
        empty.className = "ios-empty";
        empty.textContent = "최근 통화가 없습니다.";
        list.appendChild(empty);
      }

      calls.forEach((call) => {
        const row = makeRow(
          "☎",
          call.name || "알 수 없음",
          call.detail || "최근 통화",
          () => startCall(call.name || "유마")
        );
        list.appendChild(row);
      });

      page.appendChild(list);
    }

    if (tab === "contacts" || tab === "favorites") {
      const list = card();

      [
        ["🐱", "ユウマ", "일본"],
        ["👩🏻", "나나", "친구"],
        ["🌷", "민서", "친구"]
      ].forEach(([icon, name, detail]) => {
        list.appendChild(makeRow(icon, name, detail, () => startCall(name)));
      });

      page.appendChild(list);
    }

    if (tab === "keypad") {
      const dial = document.createElement("div");
      dial.className = "ios-dialer";

      dial.innerHTML = `
        <input id="dial-number" class="ios-dial-number" placeholder="전화번호" readonly>
        <div class="ios-dial-grid"></div>
        <button class="ios-call-button" id="dial-call">☎</button>
      `;

      const grid = $(".ios-dial-grid", dial);

      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]
        .forEach((number) => {
          const button = document.createElement("button");
          button.textContent = number;

          button.addEventListener("click", () => {
            $("#dial-number", dial).value += number;
          });

          grid.appendChild(button);
        });

      $("#dial-call", dial).addEventListener("click", () => {
        showToast("가상 키패드입니다. 실제 전화는 걸리지 않습니다.");
      });

      page.appendChild(dial);
    }

    content.appendChild(page);
    content.appendChild(showTabs(tabs, tab, renderPhone));
  }

  function startCall(name) {
    const isYuma = /ユウマ|유마|yuma/i.test(name);

    if (!isYuma) {
      showToast("이 연락처는 가상 통화 기능을 지원하지 않습니다.");
      return;
    }

    save("yumaCallHistory", [
      ...callHistory(),
      {
        name: "ユウマ",
        detail: new Date().toLocaleString("ko-KR")
      }
    ]);

    content.innerHTML = `
      <section class="ios-call-screen">
        <div class="ios-avatar ios-call-avatar">🐱</div>
        <h2>ユウマ</h2>
        <p id="call-state">가상 통화 · 00:00</p>
        <button id="end-call" class="ios-call-end">●</button>
        <p class="ios-muted">실제 통화는 연결되지 않습니다.</p>
      </section>
    `;

    let seconds = 0;

    const timer = setInterval(() => {
      seconds++;
      const state = $("#call-state");

      if (state) {
        const min = String(Math.floor(seconds / 60)).padStart(2, "0");
        const sec = String(seconds % 60).padStart(2, "0");
        state.textContent = `가상 통화 · ${min}:${sec}`;
      }
    }, 1000);

    $("#end-call").addEventListener("click", () => {
      clearInterval(timer);
      renderPhone("recent");
    });
  }

  /* ---------------------------------
     사진 앱
  --------------------------------- */

  function renderPhotos(tab = "library") {
    setTitle("사진");
    setView(`photos-${tab}`);

    content.innerHTML = "";

    const page = card("ios-page photos-page");

    page.appendChild(heading(
      tab === "library" ? "보관함" :
      tab === "albums" ? "앨범" :
      tab === "search" ? "검색" : "모음"
    ));

    if (tab === "library") {
      const top = document.createElement("div");
      top.className = "ios-photo-toolbar";

      const count = uploadedPhotos().length;

      top.innerHTML = `
        <span class="ios-muted">${count}장의 사진</span>
        <label class="ios-text-button ios-upload-label">
          추가
          <input type="file" id="photo-upload" accept="image/*" multiple hidden>
        </label>
      `;

      page.appendChild(top);

      const input = $("#photo-upload", top);

      input.addEventListener("change", async (event) => {
        const files = [...event.target.files];
        const currentPhotos = uploadedPhotos();

        for (const file of files) {
          if (!file.type.startsWith("image/")) continue;

          try {
            const dataURL = await fileToDataURL(file);
            currentPhotos.push({
              id: `${Date.now()}-${Math.random()}`,
              name: file.name,
              dataURL,
              addedAt: new Date().toISOString()
            });
          } catch {
            showToast("사진을 불러오지 못했습니다.");
          }
        }

        save("yumaUploadedPhotos", currentPhotos);
        renderPhotos("library");
      });

      const grid = document.createElement("div");
      grid.className = "ios-photo-grid";

      uploadedPhotos().forEach((photo) => {
        const image = document.createElement("img");
        image.src = photo.dataURL;
        image.alt = photo.name || "내 사진";
        image.loading = "lazy";

        image.addEventListener("click", () => {
          showPhotoDetail(photo);
        });

        grid.appendChild(image);
      });

      page.appendChild(grid);

      if (count === 0) {
        const empty = document.createElement("p");
        empty.className = "ios-empty";
        empty.textContent = "아직 사진이 없어요. ‘추가’를 눌러 직접 사진을 업로드해 주세요.";
        page.appendChild(empty);
      }
    }

    if (tab === "albums") {
      const list = card();

      list.appendChild(makeRow("▧", "최근 항목", `${uploadedPhotos().length}장`, () => renderPhotos("library")));
      list.appendChild(makeRow("♡", "즐겨찾기", "0장", () => showToast("즐겨찾기 앨범은 준비 중입니다.")));

      page.appendChild(list);
    }

    if (tab === "collections") {
      const empty = document.createElement("p");
      empty.className = "ios-empty";
      empty.textContent = "사진을 추가하면 모아 볼 수 있어요.";
      page.appendChild(empty);
    }

    if (tab === "search") {
      const search = document.createElement("input");
      search.className = "ios-search";
      search.placeholder = "사진 검색";
      page.appendChild(search);

      const grid = document.createElement("div");
      grid.className = "ios-photo-grid";
      page.appendChild(grid);

      function filterPhotos() {
        grid.innerHTML = "";

        uploadedPhotos()
          .filter((photo) =>
            (photo.name || "").toLowerCase().includes(search.value.toLowerCase())
          )
          .forEach((photo) => {
            const image = document.createElement("img");
            image.src = photo.dataURL;
            image.alt = photo.name || "내 사진";
            image.addEventListener("click", () => showPhotoDetail(photo));
            grid.appendChild(image);
          });
      }

      search.addEventListener("input", filterPhotos);
      filterPhotos();
    }

    content.appendChild(page);

    content.appendChild(showTabs([
      { id: "library", label: "보관함", icon: "▦" },
      { id: "collections", label: "모음", icon: "▤" },
      { id: "albums", label: "앨범", icon: "▧" },
      { id: "search", label: "검색", icon: "⌕" }
    ], tab, renderPhotos));
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function showPhotoDetail(photo) {
    content.innerHTML = `
      <section class="ios-photo-detail">
        <button class="ios-text-button" id="photo-back">‹ 보관함</button>
        <img src="${photo.dataURL}" alt="${escapeHTML(photo.name || "내 사진")}">
        <p>${escapeHTML(photo.name || "내 사진")}</p>
        <button class="ios-danger-button" id="photo-delete">사진 삭제</button>
      </section>
    `;

    $("#photo-back").addEventListener("click", () => renderPhotos("library"));

    $("#photo-delete").addEventListener("click", () => {
      const updated = uploadedPhotos().filter((item) => item.id !== photo.id);
      save("yumaUploadedPhotos", updated);
      renderPhotos("library");
    });
  }

  /* ---------------------------------
     캘린더
  --------------------------------- */

  function renderCalendar() {
    setTitle("캘린더");
    setView("calendar-month");

    content.innerHTML = "";

    const page = card("ios-page calendar-page");
    const monthNames = [
      "1월", "2월", "3월", "4월", "5월", "6월",
      "7월", "8월", "9월", "10월", "11월", "12월"
    ];

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    page.innerHTML = `
      <div class="ios-calendar-header">
        <h2 class="ios-large-title">${year}년 ${monthNames[month]}</h2>
        <div>
          <button id="calendar-prev" class="ios-round-button">‹</button>
          <button id="calendar-next" class="ios-round-button">›</button>
        </div>
      </div>

      <div class="ios-calendar-grid" id="calendar-grid"></div>

      <div class="ios-calendar-events">
        <h3 id="selected-date-title">일정</h3>
        <div id="calendar-event-list"></div>
        <button id="calendar-add" class="ios-text-button">＋ 일정 추가</button>
      </div>
    `;

    content.appendChild(page);

    const grid = $("#calendar-grid", page);
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    weekdays.forEach((day) => {
      const element = document.createElement("div");
      element.className = "ios-weekday";
      element.textContent = day;
      grid.appendChild(element);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement("span");
      blank.className = "ios-calendar-blank";
      grid.appendChild(blank);
    }

    for (let day = 1; day <= totalDays; day++) {
      const button = document.createElement("button");
      button.className = "ios-calendar-day";
      button.textContent = day;

      if (year === 2027 && month === 1 && day === 7) {
        button.classList.add("has-event");
      }

      button.addEventListener("click", () => showCalendarEvents(year, month, day));
      grid.appendChild(button);
    }

    $("#calendar-prev", page).addEventListener("click", () => {
      calendarDate = new Date(year, month - 1, 1);
      renderCalendar();
    });

    $("#calendar-next", page).addEventListener("click", () => {
      calendarDate = new Date(year, month + 1, 1);
      renderCalendar();
    });

    $("#calendar-add", page).addEventListener("click", () => {
      const title = prompt("일정 제목을 입력해 주세요.");
      if (!title || !title.trim()) return;

      const selected = read("yumaSelectedDate", "2027-02-07");
      const events = customEvents();

      events.push({
        date: selected,
        title: title.trim()
      });

      save("yumaCalendarEvents", events);
      const [y, m, d] = selected.split("-").map(Number);
      showCalendarEvents(y, m - 1, d);
    });

    showCalendarEvents(year, month, 7);
  }

  function showCalendarEvents(year, month, day) {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    save("yumaSelectedDate", dateString);

    const dateTitle = $("#selected-date-title");
    const list = $("#calendar-event-list");

    if (!dateTitle || !list) return;

    dateTitle.textContent = `${month + 1}월 ${day}일 일정`;
    list.innerHTML = "";

    const events = [];

    if (dateString === "2027-02-07") {
      events.push("유마 생일🎂");
    }

    customEvents()
      .filter((event) => event.date === dateString)
      .forEach((event) => events.push(event.title));

    if (events.length === 0) {
      const empty = document.createElement("p");
      empty.className = "ios-muted";
      empty.textContent = "예정된 일정이 없습니다.";
      list.appendChild(empty);
      return;
    }

    events.forEach((event) => {
      const row = document.createElement("div");
      row.className = "ios-event-row";
      row.textContent = event;
      list.appendChild(row);
    });
  }

  /* ---------------------------------
     음악
  --------------------------------- */

  function renderMusic() {
    setTitle("음악");
    setView("music-library");

    content.innerHTML = "";

    const page = card("ios-page music-page");

    page.innerHTML = `
      <h2 class="ios-large-title">보관함</h2>

      <div class="ios-music-cover">♫</div>
      <h3 class="ios-music-title">음악</h3>
      <p class="ios-muted">좋아하는 노래를 찾아보세요.</p>

      <div id="song-list" class="ios-song-list"></div>

      <div class="ios-player">
        <div>
          <strong id="playing-title">재생할 곡을 선택해 주세요</strong>
          <small id="playing-artist">Apple Music 검색</small>
        </div>

        <div class="ios-player-controls">
          <button id="music-prev">|◀</button>
          <button id="music-toggle">▶</button>
          <button id="music-next">▶|</button>
        </div>
      </div>
    `;

    content.appendChild(page);

    const songs = initialData.songs || [];
    const list = $("#song-list", page);
    let selected = -1;
    let playing = false;

    songs.forEach((song, index) => {
      const row = document.createElement("button");
      row.className = "ios-song-row";

      row.innerHTML = `
        <span class="ios-song-art">♫</span>
        <span class="ios-song-info">
          <strong>${escapeHTML(song[0])}</strong>
          <small>${escapeHTML(song[1])}</small>
        </span>
        <span>•••</span>
      `;

      row.addEventListener("click", () => {
        selected = index;
        $("#playing-title", page).textContent = song[0];
        $("#playing-artist", page).textContent = song[1];
        window.open(
          `https://music.apple.com/kr/search?term=${encodeURIComponent(song.join(" "))}`,
          "_blank",
          "noopener,noreferrer"
        );
      });

      list.appendChild(row);
    });

    $("#music-toggle", page).addEventListener("click", () => {
      if (selected < 0 && songs.length) {
        selected = 0;
        $("#playing-title", page).textContent = songs[0][0];
        $("#playing-artist", page).textContent = songs[0][1];
      }

      playing = !playing;
      $("#music-toggle", page).textContent = playing ? "Ⅱ" : "▶";

      showToast(
        playing
          ? "선택한 곡은 외부 음악 서비스에서 재생할 수 있어요."
          : "재생 상태를 일시 정지로 바꿨어요."
      );
    });

    $("#music-prev", page).addEventListener("click", () => {
      if (!songs.length) return;
      selected = Math.max(0, selected - 1);
      $("#playing-title", page).textContent = songs[selected][0];
      $("#playing-artist", page).textContent = songs[selected][1];
    });

    $("#music-next", page).addEventListener("click", () => {
      if (!songs.length) return;
      selected = Math.min(songs.length - 1, selected + 1);
      $("#playing-title", page).textContent = songs[selected][0];
      $("#playing-artist", page).textContent = songs[selected][1];
    });

    content.appendChild(showTabs([
      { id: "listen", label: "지금 듣기", icon: "♫" },
      { id: "browse", label: "둘러보기", icon: "▦" },
      { id: "radio", label: "라디오", icon: "◉" },
      { id: "library", label: "보관함", icon: "▤" }
    ], "library", () => showToast("음악 메뉴")));
  }

  /* ---------------------------------
     인스타그램
  --------------------------------- */

  function renderInstagram(tab = "home") {
    setTitle("Instagram");
    setView(`instagram-${tab}`);

    content.innerHTML = "";

    const page = card("ios-page instagram-page");

    page.innerHTML = `
      <div class="ios-instagram-header">
        <strong>Instagram</strong>
        <span>♡　＋</span>
      </div>

      <div class="ios-story-list">
        <button class="ios-story">
          <span>＋</span>
          <small>내 스토리</small>
        </button>
        <button class="ios-story">
          <span>🐱</span>
          <small>yuma</small>
        </button>
        <button class="ios-story">
          <span>🌷</span>
          <small>friends</small>
        </button>
      </div>

      <div id="ig-body"></div>
    `;

    content.appendChild(page);

    const body = $("#ig-body", page);

    function feed() {
      body.innerHTML = "";

      const posts = [
        {
          username: "nyang2777",
          caption: "이분 밤새고 한국 오셔서 피곤하시다네요.."
        },
        {
          username: "nyang2777",
          caption: "고양이랑 머근 밥2"
        }
      ];

      posts.forEach((post, index) => {
        const element = card("ios-instagram-post");

        const header = document.createElement("div");
        header.className = "ios-post-header";
        header.textContent = `🐱  ${post.username}`;

        const photo = document.createElement("div");
        photo.className = "ios-post-placeholder";
        photo.textContent = "사진 없음";

        const actions = document.createElement("div");
        actions.className = "ios-post-actions";

        const like = document.createElement("button");
        like.textContent = liked[index] ? "♥" : "♡";
        like.className = liked[index] ? "liked" : "";
        like.setAttribute("aria-label", "좋아요");

        like.addEventListener("click", () => {
          liked[index] = !liked[index];
          save("likedPosts", liked);
          like.textContent = liked[index] ? "♥" : "♡";
          like.classList.toggle("liked", liked[index]);
        });

        const caption = document.createElement("p");
        caption.innerHTML = `<strong>${escapeHTML(post.username)}</strong> ${escapeHTML(post.caption)}`;

        actions.append(like);
        element.append(header, photo, actions, caption);
        body.appendChild(element);
      });
    }

    function profile() {
      body.innerHTML = `
        <div class="ios-profile">
          <div class="ios-profile-top">
            <div class="ios-avatar ios-profile-avatar">🐱</div>
            <div>
              <strong>nyang2777</strong>
              <p>게시물 2　팔로워 2　팔로잉 3</p>
            </div>
          </div>
          <p>어떤 냥이 키우기..</p>
          <button class="ios-secondary-button" id="ig-edit-profile">프로필 편집</button>
          <div class="ios-profile-grid">
            <div>게시물</div><div>게시물</div>
          </div>
        </div>
      `;

      $("#ig-edit-profile", body).addEventListener("click", () => {
        showToast("프로필 편집은 준비 중입니다.");
      });
    }

    if (tab === "profile") profile();
    else feed();

    content.appendChild(showTabs([
      { id: "home", label: "홈", icon: "⌂" },
      { id: "search", label: "검색", icon: "⌕" },
      { id: "create", label: "만들기", icon: "＋" },
      { id: "reels", label: "릴스", icon: "▷" },
      { id: "profile", label: "프로필", icon: "♙" }
    ], tab, (next) => {
      if (next === "create") {
        showToast("게시물 만들기는 준비 중입니다.");
      } else if (next === "search") {
        showToast("검색 기능은 준비 중입니다.");
      } else if (next === "reels") {
        showToast("릴스는 준비 중입니다.");
      } else {
        render
