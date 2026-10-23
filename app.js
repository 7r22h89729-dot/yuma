document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);
  const home = $("#home-screen");
  const appScreen = $("#app-screen");
  const content = $("#app-content");
  const title = $("#app-title");
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
  const load = (key, fallback) => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : JSON.parse(saved);
    } catch {
      return fallback;
    }
  };
  const store = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };
  let messages = load("yumaMessages", SIM_DATA.messages);
  let kakao = load("yumaKakao", SIM_DATA.kakao);
  let liked = load("likedPosts", [false, false]);
  let current = "";
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
    const homeDate = $("#home-date");
    if (date) {
      date.textContent = now.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long"
      });
    }
    if (homeDate && date) {
      homeDate.textContent = date.textContent;
    }
  }
  updateTime();
  setInterval(updateTime, 15000);
  // 홈 화면 앱 아이콘 연결
  document.querySelectorAll("[data-app]").forEach((button) => {
    button.addEventListener("click", () => {
      openApp(button.dataset.app);
    });
  });
  const backButton = $("#back-home");
  const homeIndicator = $("#home-indicator");
  if (backButton) backButton.addEventListener("click", goHome);
  if (homeIndicator) homeIndicator.addEventListener("click", goHome);
  function openApp(name) {
    if (!names[name]) return;
    current = name;
    home.classList.add("hidden");
    appScreen.classList.remove("hidden");
    title.textContent = names[name];
    render();
  }
  function goHome() {
    appScreen.classList.add("hidden");
    home.classList.remove("hidden");
    current = "";
  }
  function render() {
    if (current === "messages") {
      renderChat("messages");
    } else if (current === "kakao") {
      renderKakao();
    } else if (current === "phone") {
      renderPhone();
    } else if (current === "photos") {
      renderPhotos();
    } else if (current === "calendar") {
      content.innerHTML = `
        <section class="card">
          <h2 class="card-title">2027년 2월 7일</h2>
          <p>🎂 유마 생일</p>
        </section>
      `;
    } else if (current === "music") {
      renderMusic();
    } else if (current === "instagram") {
      renderInstagram();
    } else if (current === "settings") {
      content.innerHTML = `
        <section class="card">
          <h2 class="card-title">설정</h2>
          <p>가상 팬 시뮬레이션입니다.</p>
          <p>실제 연락이나 메시지는 전송되지 않습니다.</p>
        </section>
      `;
    } else if (current === "camera") {
      content.innerHTML = `
        <section class="card">
          <h2 class="card-title">📷 카메라</h2>
          <p>가상 카메라입니다.</p>
        </section>
      `;
    } else if (current === "clock") {
      content.innerHTML = `
        <section class="card">
          <h2 class="card-title">시계</h2>
          <p>${new Date().toLocaleTimeString("ko-KR")}</p>
        </section>
      `;
    }
  }
  function renderChat(type) {
    const isMessages = type === "messages";
    const list = isMessages ? messages : kakao;
    content.innerHTML = `
      <div class="card">
        <div class="card-title">${isMessages ? "유마 메시지" : "유마와의 카카오톡"}</div>
        <div id="chat-bubbles"></div>
      </div>
      <form id="chat-form">
        <input id="chat-text" placeholder="메시지 입력..." autocomplete="off">
        <button class="primary-button" type="submit">보내기</button>
      </form>
    `;
    function drawBubbles() {
      const box = $("#chat-bubbles");
      if (!box) return;
      box.innerHTML = "";
      list.forEach((message) => {
        const bubble = document.createElement("div");
        bubble.className = "card";
        bubble.textContent =
          (message.from === "me" ? "나: " : "🐱 유마: ") +
          message.text;
        box.appendChild(bubble);
      });
    }
    drawBubbles();
    $("#chat-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = $("#chat-text");
      const text = input.value.trim();
      if (!text) return;
      list.push({ from: "me", text });
      store(isMessages ? "yumaMessages" : "yumaKakao", list);
      drawBubbles();
      input.value = "";
    });
  }
  function renderKakao() {
    content.innerHTML = `
      <section class="card">
        <h2 class="card-title">KakaoTalk</h2>
        <button class="primary-button" id="open-yuma-chat">🐱 유마와의 채팅</button>
        <button class="primary-button" id="open-friends">친구 목록</button>
      </section>
      <div id="kakao-extra"></div>
    `;
    $("#open-yuma-chat").addEventListener("click", () => {
      renderChat("kakao");
    });
    $("#open-friends").addEventListener("click", () => {
      $("#kakao-extra").innerHTML = `
        <section class="card">
          나나<br>민서<br>엄마♥<br>아빠♥<br>🐱 유마
        </section>
      `;
    });
  }
  function renderPhone() {
    content.innerHTML = `
      <section class="card">
        <h2 class="card-title">최근 통화</h2>
        <div id="call-list"></div>
      </section>
    `;
    const list = $("#call-list");
    SIM_DATA.phoneCalls.forEach((call) => {
      const button = document.createElement("button");
      button.className = "primary-button";
      button.textContent = `${call[0]} · ${call[1]} · ${call[2]}`;
      button.addEventListener("click", () => {
        if (!call[0].includes("ユウマ")) {
          alert("이 연락처의 통화는 비활성화되어 있어요.");
          return;
        }
        content.innerHTML = `
          <section class="card">
            <h2 class="card-title">🐱 ユウマ</h2>
            <p id="call-state">통화 중 · 00:00</p>
            <button class="primary-button" id="end-call">통화 종료</button>
          </section>
        `;
        let seconds = 0;
        const timer = setInterval(() => {
          seconds++;
          const state = $("#call-state");
          if (state) {
            state.textContent =
              `통화 중 · 00:${String(seconds).padStart(2, "0")}`;
          }
        }, 1000);
        $("#end-call").addEventListener("click", () => {
          clearInterval(timer);
          content.innerHTML = `
            <section class="card">
              <p>통화가 종료되었습니다.</p>
              <button class="primary-button" id="back-recent">최근 통화</button>
            </section>
          `;
          $("#back-recent").addEventListener("click", renderPhone);
          if (!load("callMessageAdded", false)) {
            messages.push({ from: "yuma", text: "연습 중!" });
            store("yumaMessages", messages);
            store("callMessageAdded", true);
          }
        });
      });
      list.appendChild(button);
    });
  }
  function renderPhotos() {
    content.innerHTML = `
      <section class="card">
        <h2 class="card-title">사진 · 최근 항목</h2>
        <p>🌸 사진 앨범</p>
        <p>사진은 나중에 추가할 수 있어요.</p>
      </section>
    `;
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, 1fr)";
    grid.style.gap = "8px";
    for (let i = 1; i <= 12; i++) {
      const photo = document.createElement("div");
      photo.textContent = `📷 ${i}`;
      photo.style.background = "#eee4ee";
      photo.style.borderRadius = "12px";
      photo.style.padding = "24px 4px";
      photo.style.textAlign = "center";
      grid.appendChild(photo);
    }
    content.appendChild(grid);
  }
  function renderMusic() {
    content.innerHTML = `
      <section class="card">
        <h2 class="card-title">♫ 보관함 · 플레이리스트</h2>
        <div id="song-list"></div>
      </section>
    `;
    SIM_DATA.songs.forEach((song) => {
      const button = document.createElement("button");
      button.className = "primary-button";
      button.textContent = `${song[0]} · ${song[1]}`;
      button.addEventListener("click", () => {
        const query = encodeURIComponent(song.join(" "));
        window.open(
          `https://music.apple.com/kr/search?term=${query}`,
          "_blank"
        );
      });
      $("#song-list").appendChild(button);
    });
  }
  function renderInstagram() {
    content.innerHTML = `
      <section class="card">
        <h2 class="card-title">Instagram</h2>
        <button class="primary-button" id="ig-home">홈</button>
        <button class="primary-button" id="ig-profile">프로필</button>
        <div id="ig-body"></div>
      </section>
    `;
    const body = $("#ig-body");
    function feed() {
      body.innerHTML = "";
      [
        "이분 밤새고 한국 오셔서 피곤하시다네요..",
        "고양이랑 머근 밥2"
      ].forEach((caption, index) => {
        const post = document.createElement("div");
        post.className = "card";
        const username = document.createElement("strong");
        username.textContent = "nyang2777";
        const text = document.createElement("p");
        text.textContent = caption;
        const likeButton = document.createElement("button");
        likeButton.textContent = liked[index] ? "❤️ 좋아요" : "♡ 좋아요";
        likeButton.addEventListener("click", () => {
          liked[index] = !liked[index];
          store("likedPosts", liked);
          feed();
        });
        post.append(username, text, likeButton);
        body.appendChild(post);
      });
    }
    $("#ig-home").addEventListener("click", feed);
    $("#ig-profile").addEventListener("click", () => {
      body.innerHTML = `
        <p>🐱 냐냐냥</p>
        <p>게시물 2 · 팔로워 2 · 팔로잉 3</p>
        <p>어떤 냥이 키우기..</p>
      `;
    });
    feed();
  }
});
