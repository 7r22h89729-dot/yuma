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
      renderInstagram(next);
}
}));
}

/* ———————————
설정 앱
——————————— */

function renderSettings() {
setTitle(“설정”);
setView(“settings-home”);

content.innerHTML = `
  <section class="ios-page ios-settings-page">
    <h2 class="ios-large-title">설정</h2>
    <div class="ios-settings-profile">
      <div class="ios-avatar">🐱</div>
      <div>
        <strong>YUMA SIMULATION</strong>
        <small>가상 팬 시뮬레이션</small>
      </div>
      <span>›</span>
    </div>
    <div class="ios-settings-group">
      <button class="ios-settings-row" id="setting-wallpaper">
        <span>🌈</span><span>배경화면</span><b>›</b>
      </button>
      <button class="ios-settings-row" id="setting-notifications">
        <span>🔔</span><span>알림</span><b>›</b>
      </button>
      <button class="ios-settings-row" id="setting-sound">
        <span>🔊</span><span>사운드 및 햅틱</span><b>›</b>
      </button>
      <button class="ios-settings-row" id="setting-about">
        <span>ⓘ</span><span>이 시뮬레이션에 관하여</span><b>›</b>
      </button>
    </div>
    <p class="ios-muted ios-settings-note">
      실제 전화, 메시지, SNS 계정과 연결되지 않는 팬 시뮬레이션입니다.
    </p>
  </section>
`;
$("#setting-wallpaper").addEventListener("click", () => {
  showToast("배경화면은 기존 홈 화면 설정을 사용합니다.");
});
$("#setting-notifications").addEventListener("click", () => {
  showToast("알림 기능은 준비 중입니다.");
});
$("#setting-sound").addEventListener("click", () => {
  showToast("사운드 설정은 준비 중입니다.");
});
$("#setting-about").addEventListener("click", () => {
  alert("YUMA SIMULATION\n유마와의 일상을 상상하며 즐기는 가상 팬 시뮬레이션입니다.");
});

}

/* ———————————
카메라 앱
——————————— */

function renderCamera() {
setTitle(“카메라”);
setView(“camera-home”);

content.innerHTML = `
  <section class="ios-camera-page">
    <div class="ios-camera-preview" id="camera-preview">
      <div class="ios-camera-message">
        <span>📷</span>
        <p>카메라</p>
        <small>아래 버튼으로 사진을 선택할 수 있어요.</small>
      </div>
    </div>
    <div class="ios-camera-controls">
      <label class="ios-camera-album" for="camera-file">▧</label>
      <button class="ios-camera-shutter" id="camera-shutter" aria-label="사진 촬영"></button>
      <button class="ios-camera-switch" id="camera-switch">↻</button>
    </div>
    <input type="file" id="camera-file" accept="image/*" hidden>
    <p class="ios-camera-caption">사진은 직접 선택한 경우에만 보관함에 추가됩니다.</p>
  </section>
`;
$("#camera-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("이미지 파일을 선택해 주세요.");
    return;
  }
  try {
    const dataURL = await fileToDataURL(file);
    const photos = uploadedPhotos();
    photos.push({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      dataURL,
      addedAt: new Date().toISOString()
    });
    save("yumaUploadedPhotos", photos);
    const preview = $("#camera-preview");
    preview.innerHTML = `<img src="${dataURL}" alt="선택한 사진">`;
    showToast("사진 보관함에 저장했어요!");
  } catch {
    showToast("사진을 불러오지 못했어요.");
  }
});
$("#camera-shutter").addEventListener("click", () => {
  $("#camera-file").click();
});
$("#camera-switch").addEventListener("click", () => {
  showToast("가상 카메라에서는 사진 선택 기능을 이용해 주세요.");
});

}

function stopCamera() {
if (cameraStream) {
cameraStream.getTracks().forEach((track) => track.stop());
cameraStream = null;
}
}

/* ———————————
시계 앱
——————————— */

function renderClock(tab = “world”) {
stopClockTools();

setTitle("시계");
setView(`clock-${tab}`);
content.innerHTML = "";
const page = card("ios-page ios-clock-page");
page.appendChild(heading(
  tab === "world" ? "세계 시계" :
  tab === "alarm" ? "알람" :
  tab === "stopwatch" ? "스톱워치" : "타이머"
));
if (tab === "world") {
  const now = new Date();
  const local = document.createElement("div");
  local.className = "ios-clock-city";
  local.innerHTML = `
    <div>
      <strong>서울</strong>
      <small>대한민국</small>
    </div>
    <span id="clock-seoul"></span>
  `;
  page.appendChild(local);
  const tokyo = document.createElement("div");
  tokyo.className = "ios-clock-city";
  tokyo.innerHTML = `
    <div>
      <strong>도쿄</strong>
      <small>일본</small>
    </div>
    <span id="clock-tokyo"></span>
  `;
  page.appendChild(tokyo);
  function updateClocks() {
    const seoul = $("#clock-seoul");
    const japan = $("#clock-tokyo");
    if (seoul) {
      seoul.textContent = new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Seoul"
      });
    }
    if (japan) {
      japan.textContent = new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Tokyo"
      });
    }
  }
  updateClocks();
  clockInterval = setInterval(updateClocks, 1000);
}
if (tab === "alarm") {
  const alarm = document.createElement("div");
  alarm.className = "ios-alarm-form";
  alarm.innerHTML = `
    <p class="ios-muted">알람 시간 설정</p>
    <input type="time" id="alarm-time" value="07:00">
    <button class="ios-primary-button" id="alarm-save">알람 설정</button>
    <p id="alarm-status" class="ios-muted">알람이 설정되지 않았습니다.</p>
  `;
  page.appendChild(alarm);
  $("#alarm-save", alarm).addEventListener("click", () => {
    const time = $("#alarm-time", alarm).value;
    if (!time) {
      showToast("시간을 선택해 주세요.");
      return;
    }
    save("yumaAlarm", time);
    $("#alarm-status", alarm).textContent = `${time} 알람 설정 완료`;
  });
  const savedAlarm = read("yumaAlarm", null);
  if (savedAlarm) {
    $("#alarm-time", alarm).value = savedAlarm;
    $("#alarm-status", alarm).textContent = `${savedAlarm} 알람 설정 완료`;
  }
}
if (tab === "stopwatch") {
  page.innerHTML += `
    <div class="ios-timer-display" id="stopwatch-display">00:00.00</div>
    <div class="ios-timer-buttons">
      <button class="ios-secondary-button" id="stopwatch-reset">재설정</button>
      <button class="ios-primary-button" id="stopwatch-start">시작</button>
    </div>
  `;
  let running = false;
  $("#stopwatch-start", page).addEventListener("click", () => {
    running = !running;
    $("#stopwatch-start", page).textContent = running ? "일시 정지" : "시작";
    if (running) {
      stopwatchInterval = setInterval(() => {
        stopwatchSeconds += 0.01;
        const minutes = Math.floor(stopwatchSeconds / 60);
        const seconds = Math.floor(stopwatchSeconds % 60);
        const hundredths = Math.floor((stopwatchSeconds % 1) * 100);
        const display = $("#stopwatch-display", page);
        if (display) {
          display.textContent =
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}.` +
            `${String(hundredths).padStart(2, "0")}`;
        }
      }, 10);
    } else {
      clearInterval(stopwatchInterval);
      stopwatchInterval = null;
    }
  });
  $("#stopwatch-reset", page).addEventListener("click", () => {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
    stopwatchSeconds = 0;
    running = false;
    $("#stopwatch-display", page).textContent = "00:00.00";
    $("#stopwatch-start", page).textContent = "시작";
  });
}
if (tab === "timer") {
  page.innerHTML += `
    <div class="ios-timer-display" id="timer-display">01:00</div>
    <div class="ios-timer-form">
      <label>
        분
        <input type="number" id="timer-minutes" value="1" min="0" max="999">
      </label>
      <label>
        초
        <input type="number" id="timer-secs" value="0" min="0" max="59">
      </label>
    </div>
    <div class="ios-timer-buttons">
      <button class="ios-secondary-button" id="timer-reset">재설정</button>
      <button class="ios-primary-button" id="timer-start">시작</button>
    </div>
  `;
  let running = false;
  $("#timer-start", page).addEventListener("click", () => {
    if (running) {
      clearInterval(timerInterval);
      timerInterval = null;
      running = false;
      $("#timer-start", page).textContent = "계속";
      return;
    }
    if (timerSeconds <= 0) {
      const minutes = Number($("#timer-minutes", page).value) || 0;
      const seconds = Number($("#timer-secs", page).value) || 0;
      timerSeconds = Math.max(0, minutes * 60 + seconds);
    }
    if (timerSeconds <= 0) {
      showToast("타이머 시간을 설정해 주세요.");
      return;
    }
    running = true;
    $("#timer-start", page).textContent = "일시 정지";
    timerInterval = setInterval(() => {
      timerSeconds--;
      const display = $("#timer-display", page);
      if (display) {
        display.textContent =
          `${String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:` +
          `${String(timerSeconds % 60).padStart(2, "0")}`;
      }
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        running = false;
        $("#timer-start", page).textContent = "시작";
        showToast("타이머가 종료되었습니다!");
      }
    }, 1000);
  });
  $("#timer-reset", page).addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = 0;
    running = false;
    $("#timer-display", page).textContent = "01:00";
    $("#timer-minutes", page).value = 1;
    $("#timer-secs", page).value = 0;
    $("#timer-start", page).textContent = "시작";
  });
}
content.appendChild(page);
content.appendChild(showTabs([
  { id: "world", label: "세계 시계", icon: "◷" },
  { id: "alarm", label: "알람", icon: "◴" },
  { id: "stopwatch", label: "스톱워치", icon: "⏱" },
  { id: "timer", label: "타이머", icon: "◴" }
], tab, renderClock));

}

function stopClockTools() {
if (clockInterval) {
clearInterval(clockInterval);
clockInterval = null;
}

if (stopwatchInterval) {
  clearInterval(stopwatchInterval);
  stopwatchInterval = null;
}
if (timerInterval) {
  clearInterval(timerInterval);
  timerInterval = null;
}

}

/* ———————————
토스트 메시지
——————————— */

function showToast(message) {
const toast = $(”#toast”);

if (!toast) {
  console.log(message);
  return;
}
toast.textContent = message;
toast.classList.remove("hidden");
toast.classList.add("show");
clearTimeout(showToast.timeout);
showToast.timeout = setTimeout(() => {
  toast.classList.remove("show");
  toast.classList.add("hidden");
}, 2200);

}
});
